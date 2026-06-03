const BASE_URL = "http://localhost:3000";

export async function fetchItems() {
  const response = await fetch(`${BASE_URL}/items`);
  return response.json();const 
}

export async function fetchOrders() {
  const response = await fetch(`${BASE_URL}/orders`);
  return response.json();
}

export async function addProduct(product) {
  return fetch(`${BASE_URL}/items`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(product),
  });
}