from django.db.models import DecimalField, ExpressionWrapper, F, Sum
from rest_framework import status
from rest_framework.generics import get_object_or_404
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.common.permissions import IsAdminUserRole
from apps.common.responses import success_response

from .models import Category, Company, Product, ProductVariant
from .selectors import get_catalog_kpis, list_categories, list_companies, list_products
from .serializers import (
    CategorySerializer,
    CompanySerializer,
    PriceAdjustmentSerializer,
    ProductCreateUpdateSerializer,
    ProductDetailSerializer,
    ProductListSerializer,
    ProductVariantDetailSerializer,
    ProductVariantInputSerializer,
    VariantUpdateSerializer,
)
from .services import create_category, create_company, create_product_variant, update_variant_prices, update_product_variant


class CategoryListCreateView(APIView):
    def get_permissions(self):
        if self.request.method == 'POST':
            return [IsAdminUserRole()]
        return [IsAuthenticated()]

    def get(self, request):
        serializer = CategorySerializer(list_categories(search=request.query_params.get('search', '')), many=True)
        return Response(success_response(serializer.data))

    def post(self, request):
        serializer = CategorySerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        category = create_category(**serializer.validated_data)
        return Response(success_response(CategorySerializer(category).data, 'Category created successfully.'), status=status.HTTP_201_CREATED)


class CompanyListCreateView(APIView):
    def get_permissions(self):
        if self.request.method == 'POST':
            return [IsAdminUserRole()]
        return [IsAuthenticated()]

    def get(self, request):
        serializer = CompanySerializer(list_companies(search=request.query_params.get('search', '')), many=True)
        return Response(success_response(serializer.data))

    def post(self, request):
        serializer = CompanySerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        company = create_company(**serializer.validated_data)
        return Response(success_response(CompanySerializer(company).data, 'Company created successfully.'), status=status.HTTP_201_CREATED)


class ProductListCreateView(APIView):
    def get_permissions(self):
        if self.request.method == 'POST':
            return [IsAdminUserRole()]
        return [IsAuthenticated()]

    def get(self, request):
        products = list_products(
            search=request.query_params.get('search', ''),
            category=request.query_params.get('category'),
            company=request.query_params.get('company'),
            stock_status=request.query_params.get('stock_status'),
        )
        serializer = ProductListSerializer(products, many=True, context={'request': request})
        return Response(success_response(serializer.data))

    def post(self, request):
        serializer = ProductCreateUpdateSerializer(data=request.data, context={'request': request})
        serializer.is_valid(raise_exception=True)
        product = serializer.save()
        output = ProductDetailSerializer(product, context={'request': request})
        return Response(success_response(output.data, 'Product created successfully.'), status=status.HTTP_201_CREATED)


class ProductDetailView(APIView):
    def get_permissions(self):
        if self.request.method in {'PUT', 'PATCH'}:
            return [IsAdminUserRole()]
        return [IsAuthenticated()]

    def get(self, request, pk):
        product = get_object_or_404(
            Product.objects.select_related('category').prefetch_related('variants__company', 'variants__price_history__adjusted_by'),
            pk=pk,
        )
        return Response(success_response(ProductDetailSerializer(product, context={'request': request}).data))

    def put(self, request, pk):
        return self._update(request, pk, partial=False)

    def patch(self, request, pk):
        return self._update(request, pk, partial=True)

    def _update(self, request, pk, partial):
        product = get_object_or_404(Product, pk=pk)
        serializer = ProductCreateUpdateSerializer(product, data=request.data, partial=partial, context={'request': request})
        serializer.is_valid(raise_exception=True)
        product = serializer.save()
        output = ProductDetailSerializer(product, context={'request': request})
        return Response(success_response(output.data, 'Product updated successfully.'))


class ProductVariantCreateView(APIView):
    permission_classes = [IsAdminUserRole]

    def post(self, request, pk):
        product = get_object_or_404(Product, pk=pk)
        serializer = ProductVariantInputSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        variant = create_product_variant(product=product, created_by=request.user, **serializer.validated_data)
        output = ProductVariantDetailSerializer(variant, context={'request': request})
        return Response(success_response(output.data, 'Product variant created successfully.'), status=status.HTTP_201_CREATED)


class ProductVariantDetailView(APIView):
    permission_classes = [IsAdminUserRole]

    def put(self, request, pk):
        return self._update(request, pk, partial=False)

    def patch(self, request, pk):
        return self._update(request, pk, partial=True)

    def _update(self, request, pk, partial):
        variant = get_object_or_404(ProductVariant.objects.select_related('product', 'company'), pk=pk)
        serializer = VariantUpdateSerializer(variant, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        variant = update_product_variant(variant=variant, updated_by=request.user, **serializer.validated_data)
        output = ProductVariantDetailSerializer(variant, context={'request': request})
        return Response(success_response(output.data, 'Product variant updated successfully.'))


class ProductVariantPriceAdjustmentView(APIView):
    permission_classes = [IsAdminUserRole]

    def post(self, request, pk):
        variant = get_object_or_404(ProductVariant.objects.select_related('product', 'company'), pk=pk)
        serializer = PriceAdjustmentSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data
        variant = update_variant_prices(
            variant=variant,
            updated_by=request.user,
            reason=data['reason'],
            base_price=data['new_base_price'],
            min_selling_price=data['new_min_selling_price'],
            default_selling_price=data['new_default_selling_price'],
            max_selling_price=data['new_max_selling_price'],
        )
        output = ProductVariantDetailSerializer(variant, context={'request': request})
        return Response(success_response(output.data, 'Price adjustment recorded successfully.'))


class ProductKpiStatsView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        data = get_catalog_kpis()
        if getattr(request.user, 'role', None) == 'admin':
            data['inventory_cost_value'] = ProductVariant.objects.aggregate(
                total=Sum(
                    ExpressionWrapper(F('current_stock') * F('base_price'), output_field=DecimalField(max_digits=14, decimal_places=2))
                )
            )['total'] or 0
        return Response(success_response(data))
