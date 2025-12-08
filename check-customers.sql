-- Check if customers have customerType set
SELECT
  id,
  name,
  email,
  role,
  "customerType",
  "createdAt"
FROM "User"
WHERE role = 'CUSTOMER'
ORDER BY "createdAt" DESC;
