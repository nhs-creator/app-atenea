-- Find all unique payment_method values in the sales table
-- Run this in Supabase SQL Editor to see what values exist

SELECT 
  payment_method,
  COUNT(*) as count
FROM public.sales
GROUP BY payment_method
ORDER BY count DESC;
