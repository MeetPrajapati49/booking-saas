import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './lib/AuthContext';
import Landing from './pages/Landing';
import { Signup, Login } from './pages/Auth';
import PublicBooking from './pages/PublicBooking';
import DashboardLayout from './pages/DashboardLayout';
import Overview from './pages/Overview';
import Services from './pages/Services';
import Hours from './pages/Hours';
import Bookings from './pages/Bookings';
import Calendar from './pages/Calendar';
import Clients from './pages/Clients';
import Billing from './pages/Billing';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60 * 1000, // 1 minute
      retry: 1,
    },
  },
});

function RequireAuth({ children }) {
  const { business, loading } = useAuth();
  if (loading) return null;
  if (!business) return <Navigate to="/login" replace />;
  return children;
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <Routes>
          <Route path="/" element={<Landing />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/login" element={<Login />} />
        <Route path="/booking/:slug" element={<PublicBooking />} />
        <Route path="/dashboard" element={<RequireAuth><DashboardLayout /></RequireAuth>}>
          <Route index element={<Overview />} />
          <Route path="calendar" element={<Calendar />} />
          <Route path="bookings" element={<Bookings />} />
          <Route path="clients" element={<Clients />} />
          <Route path="services" element={<Services />} />
          <Route path="hours" element={<Hours />} />
          <Route path="billing" element={<Billing />} />
        </Route>
        </Routes>
      </AuthProvider>
    </QueryClientProvider>
  );
}
