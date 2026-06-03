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

// REGISTER CHART

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
);

function SalesChart({ orders }) {
  // GROUP SALES BY DATE

  const salesMap = {};

  orders.forEach((order) => {
    const date = order.orderDate?.split(",")[0] || "Unknown";

    if (!salesMap[date]) {
      salesMap[date] = 0;
    }

    salesMap[date] += order.totalAmount || 0;
  });

  const labels = Object.keys(salesMap);

  const salesData = Object.values(salesMap);

  const data = {
    labels: labels,

    datasets: [
      {
        label: "Daily Sales",

        data: salesData,

        backgroundColor: "rgba(54, 162, 235, 0.6)",

        borderRadius: 8,
      },
    ],
  };

  const options = {
    responsive: true,

    plugins: {
      legend: {
        position: "top",
      },

      title: {
        display: true,

        text: "Daily Sales Revenue",
      },
    },
  };

  return (
    <div
      style={{
        width: "100%",
        maxWidth: "900px",
        margin: "auto",
      }}
    >
      <Bar data={data} options={options} />
    </div>
  );
}

export default SalesChart;
