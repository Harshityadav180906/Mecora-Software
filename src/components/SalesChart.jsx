import { useEffect, useState } from "react";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";
import { Bar } from "react-chartjs-2";
import { supabase } from "../lib/supabaseClient";

// REGISTER CHART
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
);

function SalesChart() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  // FETCH ORDERS FROM SUPABASE
  useEffect(() => {
    async function fetchOrders() {
      try {
        const { data, error } = await supabase
          .from("orders")
          .select("id, total_amount, order_date, created_at")
          .order("order_date", { ascending: true });

        if (error) throw error;
        setOrders(data || []);
      } catch (err) {
        console.error("Error fetching orders for chart:", err.message);
      } finally {
        setLoading(false);
      }
    }
    fetchOrders();
  }, []);

  // GROUP SALES BY DATE (YYYY-MM-DD)
  const salesMap = {};
  orders.forEach((order) => {
    const rawDate = order.order_date || order.created_at;
    if (!rawDate) return;
    const date = new Date(rawDate).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });

    if (!salesMap[date]) salesMap[date] = 0;
    salesMap[date] += parseFloat(order.total_amount || 0);
  });

  const labels = Object.keys(salesMap);
  const salesData = Object.values(salesMap);

  const data = {
    labels,
    datasets: [
      {
        label: "Daily Sales (₹)",
        data: salesData,
        backgroundColor: "rgba(54, 162, 235, 0.6)",
        borderColor: "rgba(54, 162, 235, 1)",
        borderWidth: 1,
        borderRadius: 8,
      },
    ],
  };

  const options = {
    responsive: true,
    plugins: {
      legend: { position: "top" },
      title: { display: true, text: "Daily Sales Revenue" },
      tooltip: {
        callbacks: {
          label: (ctx) =>
            new Intl.NumberFormat("en-IN", {
              style: "currency",
              currency: "INR",
            }).format(ctx.parsed.y),
        },
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          callback: (val) => `₹${val}`,
        },
      },
    },
  };

  if (loading) {
    return <p style={{ color: "#aaa" }}>Loading sales chart...</p>;
  }

  if (orders.length === 0) {
    return <p style={{ color: "#aaa" }}>No sales data available.</p>;
  }

  return (
    <div style={{ width: "100%", maxWidth: "900px", margin: "auto" }}>
      <Bar data={data} options={options} />
    </div>
  );
}

export default SalesChart;