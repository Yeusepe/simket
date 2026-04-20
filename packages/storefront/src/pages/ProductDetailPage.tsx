import { useParams } from 'react-router-dom';
import { ProductDetailPage as ProductDetailView } from '../components/ProductDetailPage';
import { fetchCatalogProduct } from '../services/catalog-api';

export function ProductDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  if (!slug) {
    throw new Error('Product slug is required.');
  }

  return (
    <ProductDetailView fetcher={fetchCatalogProduct} slug={slug} />
  );
}
