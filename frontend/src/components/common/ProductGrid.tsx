import { SkeletonGrid } from '../ui/Feedback';
import { ProductCard } from './ProductCard';
import type { Product } from '../../types/api';

export const ProductGrid = ({
  products,
  loading,
  skeletonCount = 8,
}: {
  products: Product[];
  loading?: boolean;
  skeletonCount?: number;
}) => {
  if (loading) return <SkeletonGrid count={skeletonCount} />;

  return (
    <div className="stagger grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {products.map((product) => (
        <ProductCard key={product.id} product={product} />
      ))}
    </div>
  );
};
