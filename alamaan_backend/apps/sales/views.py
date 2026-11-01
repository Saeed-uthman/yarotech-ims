from django.db import models
from django.utils import timezone
from drf_spectacular.utils import extend_schema
from rest_framework import status
from rest_framework.generics import get_object_or_404
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.common.permissions import IsAdminUserRole
from apps.common.pagination import paginated_response
from apps.common.idempotency import execute_idempotent
from apps.common.responses import success_response

from .models import Sale
from .selectors import get_sale_receipt, get_sales_kpis, list_sales
from .models import Quote, QuoteItem, SaleItem
from .quote_services import convert_quote_to_sale
from .serializers import (
    QuoteListSerializer,
    QuoteDetailSerializer,
    CreateQuoteInputSerializer,
    ConvertQuoteInputSerializer,
    CreateSaleInputSerializer,
    CreateSaleReturnSerializer,
    SaleCancelSerializer,
    SaleDetailSerializer,
    SaleListSerializer,
    SaleReceiptSerializer,
    SaleReturnOutputSerializer,
)


class SaleListCreateView(APIView):
    permission_classes = [IsAuthenticated]

    @extend_schema(responses={200: SaleListSerializer(many=True)})
    def get(self, request):
        queryset = list_sales(
            user=request.user,
            search=request.query_params.get('search', ''),
            date_range=request.query_params.get('date_range'),
            payment_status=request.query_params.get('payment_status'),
            customer_type=request.query_params.get('customer_type'),
            ordering=request.query_params.get('ordering', '-date'),
        )
        return paginated_response(
            request,
            queryset,
            SaleListSerializer,
            context={'request': request},
        )

    @extend_schema(request=CreateSaleInputSerializer, responses={201: SaleDetailSerializer})
    def post(self, request):
        def create_response():
            serializer = CreateSaleInputSerializer(data=request.data, context={'request': request})
            serializer.is_valid(raise_exception=True)
            sale = serializer.save()
            body = success_response(
                SaleDetailSerializer(sale, context={'request': request}).data,
                'Sale completed successfully.',
            )
            return body, status.HTTP_201_CREATED

        (body, response_status), replayed = execute_idempotent(
            request=request,
            scope='sales.create',
            operation=create_response,
        )
        response = Response(body, status=response_status)
        response['Idempotency-Replayed'] = str(replayed).lower()
        return response


class SaleDetailView(APIView):
    permission_classes = [IsAuthenticated]

    @extend_schema(responses={200: SaleDetailSerializer})
    def get(self, request, pk):
        queryset = Sale.objects.all()
        if getattr(request.user, 'role', None) != 'admin':
            queryset = queryset.filter(served_by=request.user)
        sale = get_object_or_404(queryset, pk=pk)
        return Response(success_response(SaleDetailSerializer(sale, context={'request': request}).data))


class SaleReceiptView(APIView):
    permission_classes = [IsAuthenticated]

    @extend_schema(responses={200: SaleReceiptSerializer})
    def get(self, request, pk):
        sale = get_sale_receipt(user=request.user, sale_id=pk)
        return Response(success_response(SaleReceiptSerializer(sale, context={'request': request}).data))


class SaleCancelView(APIView):
    permission_classes = [IsAdminUserRole]

    @extend_schema(request=SaleCancelSerializer, responses={200: SaleDetailSerializer})
    def post(self, request, pk):
        sale = get_object_or_404(Sale, pk=pk)
        serializer = SaleCancelSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        cancelled_sale = serializer.save(sale=sale, cancelled_by=request.user)
        return Response(
            success_response(SaleDetailSerializer(cancelled_sale, context={'request': request}).data, 'Sale cancelled successfully.'),
        )


class SaleReturnView(APIView):
    permission_classes = [IsAdminUserRole]

    @extend_schema(request=CreateSaleReturnSerializer, responses={201: SaleReturnOutputSerializer})
    def post(self, request, pk):
        sale = get_object_or_404(Sale, pk=pk)
        serializer = CreateSaleReturnSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        return_record = serializer.save(sale=sale, processed_by=request.user)
        return Response(
            success_response(
                SaleReturnOutputSerializer(return_record, context={'request': request}).data,
                'Sale return recorded successfully.',
            ),
            status=status.HTTP_201_CREATED,
        )


class SaleSummaryKpisView(APIView):
    permission_classes = [IsAuthenticated]

    @extend_schema(responses={200: None})
    def get(self, request):
        data = get_sales_kpis(user=request.user, date_range=request.query_params.get('date_range'))
        if getattr(request.user, 'role', None) != 'admin':
            data.pop('total_profit', None)
        return Response(success_response(data))


class WarrantyVerificationView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        query = request.query_params.get('query', '').strip()
        if not query:
            return Response(success_response({'results': []}))

        today = timezone.now().date()
        items = (
            SaleItem.objects.select_related('sale', 'sale__customer', 'variant', 'variant__product', 'variant__company')
            .filter(
                models.Q(serial_numbers__icontains=query)
                | models.Q(sale__invoice_number__iexact=query)
            )
            .order_by('-sale__created_at')[:20]
        )

        results = []
        for it in items:
            expiry = it.warranty_expiry_date
            is_valid = bool(expiry and expiry >= today)
            days_remaining = (expiry - today).days if (expiry and is_valid) else 0

            results.append({
                'sale_item_id': it.id,
                'invoice_number': it.sale.invoice_number,
                'sale_date': it.sale.created_at,
                'customer_name': it.sale.customer.name if it.sale.customer else 'Walk-in',
                'customer_phone': it.sale.customer.phone if it.sale.customer else '',
                'product_name': it.variant.product.name,
                'brand_name': it.variant.company.name,
                'model_number': it.variant.product.generic_name,
                'technical_specs': it.variant.product.dosage,
                'unit_of_measure': getattr(it.variant.product, 'unit_of_measure', 'PCS'),
                'quantity': str(it.quantity),
                'serial_numbers': it.serial_numbers,
                'warranty_months': it.warranty_months,
                'warranty_expiry_date': expiry,
                'is_warranty_valid': is_valid,
                'days_remaining': days_remaining,
            })

        return Response(success_response({'results': results}))


class QuoteListCreateView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        status_filter = request.query_params.get('status')
        search = request.query_params.get('search', '').strip()
        queryset = Quote.objects.select_related('customer', 'created_by').prefetch_related('items')
        if status_filter:
            queryset = queryset.filter(status=status_filter)
        if search:
            queryset = queryset.filter(
                models.Q(quote_number__icontains=search)
                | models.Q(customer__name__icontains=search)
            )
        return paginated_response(request, queryset, QuoteListSerializer, context={'request': request})

    def post(self, request):
        serializer = CreateQuoteInputSerializer(data=request.data, context={'request': request})
        serializer.is_valid(raise_exception=True)
        quote = serializer.save()
        return Response(
            success_response(QuoteDetailSerializer(quote, context={'request': request}).data, 'Quote created successfully.'),
            status=status.HTTP_201_CREATED,
        )


class QuoteDetailView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, pk):
        quote = get_object_or_404(Quote.objects.select_related('customer', 'created_by').prefetch_related('items'), pk=pk)
        return Response(success_response(QuoteDetailSerializer(quote, context={'request': request}).data))


class QuoteConvertToSaleView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        quote = get_object_or_404(Quote.objects.prefetch_related('items__variant__product', 'items__variant__company'), pk=pk)
        serializer = ConvertQuoteInputSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        sale = convert_quote_to_sale(
            quote=quote,
            user=request.user,
            payment_method=serializer.validated_data['payment_method'],
            amount_paid=serializer.validated_data['amount_paid'],
            serial_numbers_map=serializer.validated_data.get('serial_numbers_map', {}),
        )
        return Response(
            success_response(SaleDetailSerializer(sale, context={'request': request}).data, f'Quote {quote.quote_number} converted to Sale {sale.invoice_number}.'),
            status=status.HTTP_201_CREATED,
        )
