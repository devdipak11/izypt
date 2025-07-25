import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Star, Clock, Heart } from 'lucide-react';
import { AppHeader } from '@/components/AppHeader';
import { Button } from '@/components/ui/button';
import { useCart } from '@/contexts/CartContext';
import { ProductCard } from '@/components/ProductCard';
import { ProductQuantitySelector } from '@/components/ProductQuantitySelector';
import axios from 'axios';
import { useAuth } from '@/contexts/AuthContext';
import { BACKEND_URL } from '@/utils/utils';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Star as StarIcon } from 'lucide-react';

const API_BASE = `${BACKEND_URL}/api`;
const UPLOADS_BASE = BACKEND_URL;

const ProductDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { addToCart } = useCart();
  const { user, isAuthenticated } = useAuth();

  const [product, setProduct] = useState<any>(null);
  const [quantity, setQuantity] = useState(1);
  const [relatedProducts, setRelatedProducts] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isFavourite, setIsFavourite] = useState(false);
  const [favLoading, setFavLoading] = useState(false);
  const [siteStatus, setSiteStatus] = useState<string>('online');
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [adminReviews, setAdminReviews] = useState<any[]>([]);
  const [reviewsLoading, setReviewsLoading] = useState(false);
  const isSiteDisabled = siteStatus === 'offline' || siteStatus === 'maintenance';
  const isUnavailable = product && product.isAvailable === false;

  useEffect(() => {
    if (!id) return;
    setIsLoading(true);
    fetch(`${API_BASE}/customer/products/${id}`)
      .then(res => res.json())
      .then(async (data) => {
        let img = data.image || "";
        if (img.startsWith("/uploads")) img = `${UPLOADS_BASE}${img}`;
        else if (img && !img.startsWith("http")) img = `${UPLOADS_BASE}/uploads/${img.replace("uploads/", "")}`;
        else if (!img) img = `${UPLOADS_BASE}/uploads/default-food.jpg`;
        setProduct({ ...data, image: img }); // category is included from backend

        // Fetch favorite status if authenticated
        if (isAuthenticated) {
          try {
            const token = localStorage.getItem('token');
            const favRes = await axios.get(`${API_BASE}/customer/favourites/foods`, {
              headers: { Authorization: `Bearer ${token}` }
            });
            const favs = favRes.data || [];
            setIsFavourite(favs.some((p: any) => (p._id || p.id) === data._id));
          } catch { setIsFavourite(false); }
        }

        // Fetch all products and filter by same category (excluding current product)
        if (data.category && typeof data.category === 'string' && data.category.trim()) {
          const res = await fetch(`${API_BASE}/customer/products`);
          let all = await res.json();
          all = all
            .filter((p: any) => (p._id !== id && p.category === data.category))
            .map((p: any) => {
              let img = p.image || "";
              if (img.startsWith("/uploads")) img = `${UPLOADS_BASE}${img}`;
              else if (img && !img.startsWith("http")) img = `${UPLOADS_BASE}/uploads/${img.replace("uploads/", "")}`;
              else if (!img) img = `${UPLOADS_BASE}/uploads/default-food.jpg`;
              return { ...p, image: img, id: p._id, restaurant: p.restaurantName || "Restaurant" };
            });
          setRelatedProducts(all);
        } else {
          setRelatedProducts([]);
        }
      })
      .finally(() => setIsLoading(false));
  }, [id, isAuthenticated]);

  // Fetch site status
  useEffect(() => {
    fetch(`${API_BASE}/admin/system-status`)
      .then(res => res.json())
      .then(data => setSiteStatus(data.status || 'online'))
      .catch(() => setSiteStatus('online'));
  }, []);

  // Favorite toggle handler
  const handleToggleFavourite = async () => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }
    setFavLoading(true);
    const token = localStorage.getItem('token');
    try {
      if (isFavourite) {
        await axios.post(
          `${API_BASE}/customer/favourites/food/deselect`,
          { productId: product._id || product.id },
          { headers: { Authorization: `Bearer ${token}` } }
        );
        setIsFavourite(false);
      } else {
        await axios.post(
          `${API_BASE}/customer/favourites/food/select`,
          { productId: product._id || product.id },
          { headers: { Authorization: `Bearer ${token}` } }
        );
        setIsFavourite(true);
      }
    } catch {
      // Optionally show error
    } finally {
      setFavLoading(false);
    }
  };

  const handleAddToCart = () => {
    if (isSiteDisabled || isUnavailable) return;
    if (product) addToCart(product, quantity);
  };

  // Fetch admin reviews when modal opens
  useEffect(() => {
    if (showReviewModal && product && product._id) {
      setReviewsLoading(true);
      fetch(`${BACKEND_URL}/api/admin/product-reviews?productId=${product._id}`)
        .then(res => res.json())
        .then(data => setAdminReviews(Array.isArray(data) ? data : []))
        .finally(() => setReviewsLoading(false));
    }
  }, [showReviewModal, product]);

  if (isLoading) {
    return (
      <div className="app-container">
        <AppHeader showBackButton showCart />
        <div className="flex-1 flex items-center justify-center">
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="app-container">
        <AppHeader showBackButton showCart />
        <div className="flex-1 p-4 flex flex-col items-center justify-center">
          <p className="text-xl font-semibold">Product not found</p>
          <Button onClick={() => navigate('/')} className="mt-4">Go to Home</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="app-container">
      <AppHeader showBackButton showCart />
      <div className="flex-1 pb-20">
        <div className="relative">
          <div className="w-full h-64 bg-white flex items-center justify-center">
            <img
              src={product.image}
              alt={product.name}
              className="w-full h-64 object-contain"
            />
          </div>
          {/* Heart icon button */}
          <button
            className="absolute top-4 right-4 z-10 bg-white/80 rounded-full p-2 shadow"
            onClick={handleToggleFavourite}
            aria-label={isFavourite ? "Remove from favourites" : "Add to favourites"}
            disabled={favLoading}
          >
            <Heart
              className={`w-7 h-7 ${isFavourite ? "fill-red-500 text-red-500" : "text-gray-400"}`}
            />
          </button>
          {product.isVeg !== undefined && (
            <span
              className={`absolute top-4 left-4 w-6 h-6 rounded-full ${
                product.isVeg ? 'bg-green-500' : 'bg-red-500'
              } flex items-center justify-center border-2 border-white`}
            >
              <span className="w-4 h-4 bg-white rounded-full"></span>
            </span>
          )}
        </div>
        <div className="p-4">
          <h1 className="text-2xl font-bold">{product.name}</h1>
          {product.restaurantName && (
            <div className="mt-1 text-gray-600">{product.restaurantName}</div>
          )}
          {/* Show product category */}
          <div className="mt-2">
            <span className="inline-block px-3 py-1 rounded-full bg-gray-100 text-sm text-gray-700 font-medium">
              Category: {product.category || "N/A"}
            </span>
          </div>
          <div className="flex mt-2 space-x-3">
            {product.rating && (
              <div className="flex items-center">
                <Star className="w-4 h-4 text-yellow-500 fill-yellow-500 mr-1" />
                <span className="font-semibold">{product.rating}</span>
                {product.ratingCount && (
                  <span className="text-gray-500 text-sm ml-1">({product.ratingCount})</span>
                )}
              </div>
            )}
            {product.restaurant && (
              <div className="flex items-center">
                <Clock className="w-4 h-4 text-gray-500 mr-1" />
                <span className="text-gray-500">25-40 min</span>
              </div>
            )}
          </div>
          <div className="mt-4">
            <h2 className="font-semibold text-lg">About</h2>
            <p className="text-gray-600 mt-1">{product.description}</p>
          </div>
          {product.returnPolicy && (
            <div className="mt-4">
              <h2 className="font-semibold text-lg">Return Policy</h2>
              <p className="text-gray-600 mt-1">{product.returnPolicy}</p>
              {/* --- See Reviews Button --- */}
              <button
                className="mt-3 px-4 py-2 bg-blue-600 text-white rounded font-medium hover:bg-blue-700 transition"
                onClick={() => setShowReviewModal(true)}
              >
                See Reviews
              </button>
            </div>
          )}
          <div className="mt-6 flex justify-between items-center">
            <div className="text-lg">
              <span className="font-bold text-xl">₹{(product.discountedPrice || product.price).toFixed(2)}</span>
              {product.discountedPrice && (
                <span className="text-gray-500 text-sm line-through ml-2">
                  ₹{product.price.toFixed(2)}
                </span>
              )}
            </div>
            <ProductQuantitySelector
              quantity={quantity}
              onIncrease={() => setQuantity(quantity + 1)}
              onDecrease={() => setQuantity(Math.max(1, quantity - 1))}
            />
          </div>
        </div>
        {isSiteDisabled && (
          <div className="p-3 mb-2 rounded-lg bg-orange-50 border border-orange-200 text-orange-700 text-center font-semibold text-base">
            {siteStatus === 'offline'
              ? 'We are Closed, not accepting orders currently. Please check back later.'
              : 'Maintenance Mode: We are performing scheduled maintenance. Please try again soon.'}
          </div>
        )}
        {relatedProducts.length > 0 && (
          <div className="mt-6 p-4 border-t border-gray-100">
            <h2 className="font-bold text-xl mb-3">You Might Also Like</h2>
            <div className="grid grid-cols-1 gap-4">
              {relatedProducts.map((item) => (
                <div key={item.id} className="border rounded-lg overflow-hidden bg-white shadow-sm">
                  <div className="flex">
                    <img
                      src={item.image}
                      alt={item.name}
                      className="w-24 h-24 object-cover"
                    />
                    <div className="p-3 flex-1">
                      <div className="flex justify-between">
                        <h3 className="font-medium">{item.name}</h3>
                        <span className="font-semibold">₹{(item.discountedPrice || item.price).toFixed(2)}</span>
                      </div>

                      {item.restaurantName && (
                        <div className="text-xs text-gray-500 mt-1">
                          {item.restaurantName}
                        </div>
                      )}

                      <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                        {item.description}
                      </p>

                      <div className="mt-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => navigate(`/product/${item.id}`)}
                          className="text-xs mr-2"
                        >
                          View Details
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => !isSiteDisabled && addToCart(item, 1)}
                          className="text-xs bg-app-primary"
                          disabled={isSiteDisabled}
                        >
                          Add to Cart
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4 max-w-md mx-auto">
        <Button
          onClick={handleAddToCart}
          className="app-button app-button-primary w-full text-lg font-bold bg-app-primary"
          disabled={isSiteDisabled || isUnavailable}
        >
          {isUnavailable
            ? "Unavailable"
            : `Add to Cart - ₹${((product.discountedPrice || product.price) * quantity).toFixed(2)}`}
        </Button>
      </div>

      {/* --- Admin Reviews Modal --- */}
      <Dialog open={showReviewModal} onOpenChange={setShowReviewModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Product Reviews</DialogTitle>
          </DialogHeader>
          {reviewsLoading ? (
            <div className="py-6 text-center text-gray-500">Loading reviews...</div>
          ) : (
            <div className="space-y-4 max-h-[60vh] overflow-y-auto">
              {/* --- Dummy 4.5 Star Review --- */}
              <div className="border rounded p-3 bg-gray-50 flex flex-col gap-2">
                <div className="flex items-center gap-2">
                  {[1,2,3,4].map(i => (
                    <StarIcon key={i} className="w-5 h-5 text-yellow-500 fill-yellow-500" />
                  ))}
                  <svg width="20" height="20" viewBox="0 0 20 20" className="inline-block" fill="none">
                    <defs>
                      <linearGradient id="half">
                        <stop offset="50%" stopColor="#facc15" />
                        <stop offset="50%" stopColor="#e5e7eb" />
                      </linearGradient>
                    </defs>
                    <StarIcon
                      width={20}
                      height={20}
                      className="text-yellow-500"
                      style={{ fill: 'url(#half)' }}
                    />
                  </svg>
                  <span className="ml-2 font-semibold text-yellow-700">4.5</span>
                </div>
              </div>
              {/* --- Admin & Customer Reviews --- */}
              {adminReviews.length === 0 ? (
                <div className="py-6 text-center text-gray-500">No reviews for this product.</div>
              ) : (
                adminReviews.map((r) => (
                  <div key={r._id} className="border rounded p-3 mb-4 bg-white">
                    {/* Show stars if rating exists */}
                    {typeof r.rating === 'number' && (
                      <div className="flex items-center mb-1">
                        {[1,2,3,4,5].map(i => (
                          <StarIcon
                            key={i}
                            className={`w-4 h-4 ${i <= r.rating ? 'text-yellow-500 fill-yellow-500' : 'text-gray-300'}`}
                          />
                        ))}
                        <span className="ml-2 text-yellow-700 font-semibold">{r.rating.toFixed(1)}</span>
                      </div>
                    )}
                    {/* Show reviewer name: 'Izypt' for admin, else customer name */}
                    <div className="mb-1 font-semibold text-gray-700">
                      <span className="text-sm text-gray-500">{r.createdBy && r.createdBy.name ? r.createdBy.name : 'Izypt'}</span>
                    </div>
                    <div className="mb-2 text-gray-800 whitespace-pre-line">{r.reviewText}</div>
                    {/* Show review image if present */}
                    {r.image && (
                      <div className="flex gap-2 mt-2">
                        <img
                          src={r.image.startsWith('/uploads') ? `${UPLOADS_BASE}${r.image}` : r.image}
                          alt="review"
                          className="w-20 h-20 object-cover rounded border"
                        />
                      </div>
                    )}
                    <div className="text-xs text-gray-400 mt-2">
                      Posted: {new Date(r.createdAt).toLocaleString()}
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ProductDetail;
