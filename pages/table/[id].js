import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/router';
import useSWR from 'swr';
import { supabase } from '../../lib/supabase';
import BottomCart from '../../components/BottomCart';
import { fetchMenu, apiUrl } from '../../lib/api';
import { motion } from 'framer-motion';
import { WifiOff } from 'lucide-react';

export default function Table() {
  const router = useRouter();
  const { id } = router.query;

  const [cart, setCart] = useState([]);
  const [isAppending, setIsAppending] = useState(false);
  const [appendOrderId, setAppendOrderId] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [error, setError] = useState(null);
  const [addedItems, setAddedItems] = useState({});
  const [showConfirm, setShowConfirm] = useState(false);
  const [confirmAction, setConfirmAction] = useState(null);
  const [hasRedirected, setHasRedirected] = useState(false);
  const [activeWifi, setActiveWifi] = useState(null);
  const [isAllowed, setIsAllowed] = useState(false);
  const [checking, setChecking] = useState(true);

  const sliderRef = useRef(null);

  useEffect(() => {
    const checkAccess = async () => {
      try {
        const res = await fetch('https://api64.ipify.org?format=json');
        const data = await res.json();
        const ip = data.ip;
        const allowedPrefixes = ['2402:e280', '58.84'];
        const allowed = allowedPrefixes.some(prefix => ip?.startsWith(prefix));
        setIsAllowed(allowed);
      } catch (err) {
        console.error('IP check failed:', err);
      } finally {
        setChecking(false);
      }
    };
    checkAccess();
  }, []);

  useEffect(() => {
    if (!isAllowed) {
      const fetchActiveWifi = async () => {
        const { data, error } = await supabase
          .from('wifi_credentials')
          .select('*')
          .eq('is_active', true)
          .single();

        if (!error && data) {
          setActiveWifi(data);
        }
      };
      fetchActiveWifi();
    }
  }, [isAllowed]);

  const { data: menu, error: fetchError } = useSWR(apiUrl ? `${apiUrl}/api/menu` : null, fetchMenu);
  const categories = ['All', ...new Set(menu?.map(item => item.category).filter(Boolean))];
  const filteredMenu = menu
    ? menu.filter(item => selectedCategory === 'All' || item.category === selectedCategory)
    : [];

  useEffect(() => {
    const el = sliderRef.current;
    const handleScroll = () => {
      if (el) el.scrollLeft > 0;
    };
    el?.addEventListener('scroll', handleScroll);
    return () => el?.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    localStorage.removeItem('orderId');
    localStorage.removeItem('appendOrder');

    const checkActiveOrder = async () => {
      if (!id || hasRedirected) return;
      try {
        const { data, error } = await supabase
          .from('orders')
          .select('id, status')
          .eq('table_id', parseInt(id))
          .eq('status', 'pending')
          .order('created_at', { ascending: false })
          .limit(1);

        if (error) throw error;

        if (data.length > 0) {
          const currentOrderId = data[0].id;
          if (!router.asPath.includes(`/order/${currentOrderId}`)) {
            localStorage.setItem('orderId', currentOrderId);
            setHasRedirected(true);
            router.replace(`/order/${currentOrderId}`);
          }
        }
      } catch (err) {
        setError('Failed to check active orders.');
      }
    };

    checkActiveOrder();
  }, [id, hasRedirected, router]);

  useEffect(() => {
    const appendOrder = localStorage.getItem('appendOrder');
    if (appendOrder) {
      const { orderId, items } = JSON.parse(appendOrder);
      setCart(items);
      setIsAppending(true);
      setAppendOrderId(orderId);
    }
  }, []);

  const addToCart = (item) => {
    const wasEmpty = cart.length === 0;
    setAddedItems(prev => ({ ...prev, [item.id]: true }));
    setTimeout(() => setAddedItems(prev => ({ ...prev, [item.id]: false })), 1000);

    setCart(prev => {
      const exists = prev.find(cartItem => cartItem.item_id === item.id);
      if (exists) {
        return prev.map(cartItem =>
          cartItem.item_id === item.id
            ? { ...cartItem, quantity: (cartItem.quantity || 1) + 1 }
            : cartItem
        );
      }
      return [...prev, { ...item, item_id: item.id, quantity: 1 }];
    });

    if (wasEmpty) {
      setIsCartOpen(true);
      setError('Item added to cart!');
      setTimeout(() => setError(null), 3000);
    }
  };

  const placeOrder = async () => {
    if (cart.length === 0) {
      setError('Your cart is empty.');
      setShowConfirm(false);
      return;
    }

    try {
      setError(null);
      const controller = new AbortController();
      setTimeout(() => controller.abort(), 30000);

      const response = await fetch(`${apiUrl}/api/orders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ table_id: parseInt(id), items: cart }),
        signal: controller.signal,
      });

      const order = await response.json();
      if (!response.ok || !order.id) throw new Error(order.error || `HTTP ${response.status}`);

      localStorage.setItem('orderId', order.id);
      setCart([]);
      setIsCartOpen(false);
      setShowConfirm(false);
      router.replace(`/order/${order.id}`);
    } catch (err) {
      setError(`Failed to place order: ${err.message}`);
      setTimeout(() => setError(null), 5000);
    }
  };

  const updateOrder = async () => {
    if (cart.length === 0) {
      setError('Your cart is empty.');
      setShowConfirm(false);
      return;
    }

    try {
      setError(null);
      const controller = new AbortController();
      setTimeout(() => controller.abort(), 30000);

      const response = await fetch(`${apiUrl}/api/orders/${appendOrderId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: cart }),
        signal: controller.signal,
      });

      const order = await response.json();
      if (!response.ok || !order.id) throw new Error(order.error || `HTTP ${response.status}`);

      localStorage.removeItem('appendOrder');
      setIsAppending(false);
      setAppendOrderId(null);
      localStorage.setItem('orderId', order.id);
      setCart([]);
      setIsCartOpen(false);
      setShowConfirm(false);
      router.replace(`/order/${order.id}`);
    } catch (err) {
      setError(`Failed to update order: ${err.message}`);
      setTimeout(() => setError(null), 5000);
    }
  };

  const handleConfirm = (action) => {
    setConfirmAction(() => action);
    setShowConfirm(true);
    setIsCartOpen(false);
  };

  const toggleCart = () => setIsCartOpen(prev => !prev);
  const scrollLeft = () => sliderRef.current?.scrollBy({ left: -100, behavior: 'smooth' });
  const scrollRight = () => sliderRef.current?.scrollBy({ left: 100, behavior: 'smooth' });

  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center text-lg font-semibold">
        Checking Wi-Fi...
      </div>
    );
  }

  if (!isAllowed) {
    return (
      <div className="fixed inset-0 bg-gradient-to-br from-white to-blue-100 flex flex-col justify-center items-center p-6 text-center z-50">
        <motion.div
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 150, damping: 10 }}
          className="mb-6"
        >
          <div className="bg-blue-500 text-white p-4 rounded-full shadow-lg animate-pulse">
            <WifiOff className="w-10 h-10" />
          </div>
        </motion.div>

        <motion.h2
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="text-3xl font-extrabold text-red-600 drop-shadow mb-2"
        >
          Access Restricted
        </motion.h2>

        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="font-bold text-xl text-green-700 mb-6"
        >
          Please connect to the café’s Wi-Fi to access the menu.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="mb-6 bg-gradient-to-r from-blue-100 via-blue-200 to-blue-100 p-4 rounded-xl shadow-xl w-full max-w-sm"
        >
          {activeWifi ? (
            <p className="text-gray-800 font-semibold text-left text-sm">
              <span className="block mb-2">📶 <strong>Wi-Fi Name:</strong> {activeWifi.wifiname}</span>
              <span className="block">🔒 <strong>Password:</strong> {activeWifi.password}</span>
            </p>
          ) : (
            <p className="text-gray-500 text-sm">Fetching Wi-Fi details...</p>
          )}
        </motion.div>

        <motion.button
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          onClick={() => window.location.reload()}
          className="bg-blue-600 text-white px-6 py-2 rounded-md shadow hover:bg-blue-700 transition-all duration-300 hover:scale-105"
        >
          I’ve Connected – Retry
        </motion.button>
      </div>
    );
  }

  return (
    <section className="min-h-screen bg-gray-50 p-4 relative">
      <header className="text-center mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Welcome to Gsaheb Café</h1>
      </header>

      <div className="overflow-x-auto flex gap-2 mb-4" ref={sliderRef}>
        {categories.map(category => (
          <button
            key={category}
            onClick={() => setSelectedCategory(category)}
            className={`px-4 py-2 rounded ${selectedCategory === category ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}
          >
            {category}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-4">
        {filteredMenu?.map(item => (
          <div key={item.id} className="bg-white p-3 rounded shadow">
            <img src={item.image_url} alt={item.name} className="w-full h-24 object-cover rounded mb-2" />
            <h3 className="font-semibold">{item.name}</h3>
            <p className="text-sm text-gray-500">{item.category}</p>
            <p className="text-sm font-bold">₹{item.price.toFixed(2)}</p>
            <button
              onClick={() => addToCart(item)}
              className="w-full mt-2 bg-green-500 text-white py-1 rounded"
            >
              Add to Cart
            </button>
          </div>
        ))}
      </div>

      <BottomCart
        cart={cart}
        setCart={setCart}
        onPlaceOrder={() => handleConfirm(isAppending ? updateOrder : placeOrder)}
        onClose={() => setIsCartOpen(false)}
        isOpen={isCartOpen}
      />

      {error && (
        <div className="fixed top-4 right-4 p-4 rounded shadow-lg bg-red-100 text-red-800 z-50">
          {error}
          <button className="ml-2 font-bold" onClick={() => setError(null)}>✕</button>
        </div>
      )}

      {showConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-40">
          <div className="bg-white p-6 rounded shadow-md w-full max-w-sm">
            <h2 className="text-lg font-bold mb-4">Confirm Order</h2>
            <p>{isAppending ? 'Update this order?' : 'Place this order?'}</p>
            <div className="mt-4 flex gap-4">
              <button onClick={() => setShowConfirm(false)} className="flex-1 bg-gray-200 py-2 rounded">Cancel</button>
              <button onClick={confirmAction} className="flex-1 bg-blue-600 text-white py-2 rounded">Confirm</button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

// import { useState, useEffect } from 'react';
// import { useRouter } from 'next/router';
// import useSWR from 'swr';
// import { supabase } from '../../lib/supabase';
// import BottomCart from '../../components/BottomCart';
// import { CakeIcon, ShoppingCartIcon } from '@heroicons/react/24/outline';

// const fetcher = (url) => fetch(url).then(res => res.json());

// export default function Table() {
//   const router = useRouter();
//   const { id } = router.query;
//   const [cart, setCart] = useState([]);
//   const [isAppending, setIsAppending] = useState(false);
//   const [appendOrderId, setAppendOrderId] = useState(null);
//   const [selectedCategory, setSelectedCategory] = useState('All');
//   const [isCartOpen, setIsCartOpen] = useState(false);
//   const [error, setError] = useState(null);
//   const [addedItems, setAddedItems] = useState({});

//   // Clear and check existing orders
//   useEffect(() => {
//     localStorage.removeItem('orderId');
//     localStorage.removeItem('appendOrder');

//     async function checkActiveOrder() {
//       if (!id) return;
//       try {
//         const { data, error } = await supabase
//           .from('orders')
//           .select('id, status')
//           .eq('table_id', parseInt(id))
//           .eq('status', 'pending')
//           .order('created_at', { ascending: false })
//           .limit(1);

//         if (error) throw error;

//         if (data?.length > 0) {
//           localStorage.setItem('orderId', data[0].id);
//           router.replace(`/order/${data[0].id}`);
//         }
//       } catch (err) {
//         console.error('Error checking table orders:', err.message);
//       }
//     }

//     checkActiveOrder();
//   }, [id, router]);

//   // Restore append order from localStorage
//   useEffect(() => {
//     const appendOrder = localStorage.getItem('appendOrder');
//     if (appendOrder) {
//       const { orderId, items } = JSON.parse(appendOrder);
//       setCart(items || []);
//       setIsAppending(true);
//       setAppendOrderId(orderId);
//     }
//   }, []);

//   // Fetch menu
//   const envApiUrl = process.env.NEXT_PUBLIC_API_URL || '';
//   const apiUrl = envApiUrl.replace(/\/+$/, '');
//   const { data: menu, error: fetchError, isLoading } = useSWR(`${apiUrl}/api/menu`, fetcher);

//   const categories = ['All', ...new Set((menu || []).map(item => item.category).filter(Boolean))];
//   const filteredMenu = selectedCategory === 'All'
//     ? (menu || [])
//     : (menu || []).filter(item => item.category === selectedCategory);

//   useEffect(() => {
//     if (fetchError) {
//       setError('Failed to load menu. Please try again.');
//     }
//   }, [fetchError]);

//   const addToCart = (item) => {
//     setAddedItems(prev => ({ ...prev, [item.id]: true }));
//     setTimeout(() => {
//       setAddedItems(prev => ({ ...prev, [item.id]: false }));
//     }, 1000);

//     setCart(prevCart => {
//       const existing = prevCart.find(ci => ci.item_id === item.id);
//       if (existing) {
//         return prevCart.map(ci =>
//           ci.item_id === item.id ? { ...ci, quantity: (ci.quantity || 1) + 1 } : ci
//         );
//       }
//       return [
//         ...prevCart,
//         {
//           item_id: item.id,
//           name: item.name,
//           price: item.price,
//           category: item.category,
//           image_url: item.image_url,
//           quantity: 1,
//         },
//       ];
//     });

//     setIsCartOpen(true);
//   };

//   const placeOrder = async () => {
//     if (cart.length === 0) return alert('Cart is empty');
//     try {
//       setError(null);
//       const response = await fetch(`${apiUrl}/api/orders`, {
//         method: 'POST',
//         headers: { 'Content-Type': 'application/json' },
//         body: JSON.stringify({ table_id: parseInt(id), items: cart }),
//         signal: (typeof AbortSignal !== 'undefined' && AbortSignal.timeout)
//           ? AbortSignal.timeout(30000)
//           : undefined,
//       });

//       const order = await response.json();
//       if (!response.ok || !order.id) {
//         throw new Error(order.error || `HTTP ${response.status}`);
//       }

//       localStorage.setItem('orderId', order.id);
//       setCart([]);
//       setIsCartOpen(false);
//       router.replace(`/order/${order.id}`);
//     } catch (err) {
//       console.error('PlaceOrder error:', err.message);
//       setError(`Failed to place order: ${err.message}`);
//     }
//   };

//   const updateOrder = async () => {
//     if (cart.length === 0) return alert('Cart is empty');
//     try {
//       setError(null);
//       const response = await fetch(`${apiUrl}/api/orders/${appendOrderId}`, {
//         method: 'PATCH',
//         headers: { 'Content-Type': 'application/json' },
//         body: JSON.stringify({ items: cart }),
//         signal: (typeof AbortSignal !== 'undefined' && AbortSignal.timeout)
//           ? AbortSignal.timeout(30000)
//           : undefined,
//       });

//       const order = await response.json();
//       if (!response.ok || !order.id) {
//         throw new Error(order.error || `HTTP ${response.status}`);
//       }

//       localStorage.removeItem('appendOrder');
//       setIsAppending(false);
//       setAppendOrderId(null);
//       localStorage.setItem('orderId', order.id);
//       setCart([]);
//       setIsCartOpen(false);
//       router.replace(`/order/${order.id}`);
//     } catch (err) {
//       console.error('UpdateOrder error:', err.message);
//       setError(`Failed to update order: ${err.message}`);
//     }
//   };

//   if (isLoading) return <div className="text-center mt-10">Loading menu...</div>;
//   if (error) return <div className="text-center mt-10 text-red-500">{error}</div>;

//   return (
//     <div className="min-h-screen bg-gray-50 p-4 relative">
//       {/* Cart Icon */}
//       {cart.length > 0 && (
//         <button
//           className="fixed top-4 right-4 bg-blue-500 text-white p-2 rounded-full shadow-lg hover:bg-blue-600 z-50"
//           onClick={() => setIsCartOpen(prev => !prev)}
//         >
//           <ShoppingCartIcon className="h-6 w-6" />
//           <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
//             {cart.reduce((sum, item) => sum + (item.quantity || 1), 0)}
//           </span>
//         </button>
//       )}

//       {/* Header */}
//       <div className="flex items-center justify-center gap-2 mb-6">
//         <CakeIcon className="h-6 w-6 text-blue-500" />
//         <h1 className="text-2xl font-bold text-gray-800">Welcome to Valtri Labs Cafe</h1>
//         <CakeIcon className="h-6 w-6 text-blue-500" />
//       </div>

//       {/* Categories */}
//       <div className="mb-6 overflow-x-auto whitespace-nowrap pb-2">
//         <div className="flex gap-2">
//           {categories.map(category => (
//             <button
//               key={category}
//               className={`px-4 py-2 rounded-lg text-sm font-medium ${
//                 selectedCategory === category
//                   ? 'bg-blue-500 text-white'
//                   : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
//               }`}
//               onClick={() => setSelectedCategory(category)}
//             >
//               {category}
//             </button>
//           ))}
//         </div>
//       </div>

//       {/* Menu Grid */}
//       <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
//         {filteredMenu.length === 0 ? (
//           <p className="col-span-full text-center text-gray-500">No items in this category.</p>
//         ) : (
//           filteredMenu.map(item => (
//             <div key={item.id} className="bg-white p-4 rounded-lg shadow-md hover:shadow-lg">
//               <img
//                 src={item.image_url || 'https://images.unsplash.com/photo-1550547660-d9450f859349'}
//                 alt={item.name}
//                 className="w-full h-32 object-cover rounded-md mb-2"
//               />
//               <h2 className="font-semibold text-lg">{item.name}</h2>
//               <p className="text-sm text-gray-500">{item.category}</p>
//               <p className="text-sm font-medium">₹{item.price.toFixed(2)}</p>
//               <button
//                 className={`mt-2 w-full py-2 rounded-lg text-white ${
//                   addedItems[item.id]
//                     ? 'bg-blue-500 hover:bg-blue-600'
//                     : 'bg-green-500 hover:bg-green-600'
//                 }`}
//                 onClick={() => addToCart(item)}
//               >
//                 {addedItems[item.id] ? 'Added' : 'Add to Cart'}
//               </button>
//             </div>
//           ))
//         )}
//       </div>

//       {/* Bottom Cart */}
//       <BottomCart
//         cart={cart}
//         setCart={setCart}
//         onPlaceOrder={isAppending ? updateOrder : placeOrder}
//         onClose={() => setIsCartOpen(false)}
//         isOpen={isCartOpen}
//       />
//     </div>
//   );
// }

