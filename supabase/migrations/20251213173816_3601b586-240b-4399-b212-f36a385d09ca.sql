-- Enable realtime for orders table so OpenOrders updates automatically
ALTER PUBLICATION supabase_realtime ADD TABLE public.orders;