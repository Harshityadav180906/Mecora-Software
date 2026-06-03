import { useEffect, useState } from "react";
import "./AllOrders.css";

const AllOrders = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState("newest");
  const [searchQuery, setSearchQuery] = useState("");

  // Editing Pipeline Component States
  const [editingOrderId, setEditingOrderId] = useState(null);
  const [editForm, setEditForm] = useState(null);

  // Dedicated Native Print Engine Snapshot state
  const [activePrintTarget, setActivePrintTarget] = useState(null);

  const shopDetails = {
    name: "RAKESH MEDICOS",
    address: "RZD, 258A, RAJ NAGAR PART 2, PALAM COLONY, NEW DELHI 110077, NEAR NEW GURUDWARA",
    phone: "8010211317; 9810848820",
    gstin: "07AABPY1653L1ZC",
    dlNo: "PLM-119119-20, 119120-21",
  };

  const fetchOrders = () => {
    setLoading(true);
    fetch("http://localhost:3000/orders")
      .then((res) => res.json())
      .then((data) => {
        setOrders(Array.isArray(data) ? data : []);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Error fetching orders:", err);
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  const formatOrderDate = (dateStr) => {
    if (!dateStr) return "N/A";
    const date = new Date(dateStr);
    return isNaN(date.getTime()) ? dateStr : date.toLocaleString("en-IN");
  };

  const getDateValue = (dateStr) => {
    const date = new Date(dateStr);
    return isNaN(date.getTime()) ? 0 : date.getTime();
  };

  // --- Inline Live Calculation Mechanics ---
  const handleEditItemQtyChange = (productIdx, newQty) => {
    if (!editForm) return;
    const updatedProducts = [...editForm.products];
    updatedProducts[productIdx].quantity = Math.max(1, Number(newQty || 1));
    
    // Recalculate financial totals dynamically
    const baseSubtotal = updatedProducts.reduce((sum, p) => sum + (Number(p.rate || 0) * Number(p.quantity || 1)), 0);
    const resolvedTotal = Math.round(baseSubtotal);

    setEditForm({
      ...editForm,
      products: updatedProducts,
      totalAmount: resolvedTotal,
      cashReceived: editForm.paymentMethod.toLowerCase() === "cash" ? editForm.cashReceived : resolvedTotal
    });
  };

  // --- Initialize Modifier Payload Snapshot ---
  const startEditingOrder = (order) => {
    setEditingOrderId(order.id);
    setEditForm({
      id: order.id,
      cashMemoNo: order.cashMemoNo || Math.floor(1000 + Math.random() * 9000),
      patientName: order.patientName || "",
      patientPhone: order.patientPhone || "",
      patientAddress: order.patientAddress || "",
      doctorName: order.doctorName || "N/A",
      paymentMethod: order.paymentMethod || "Cash",
      totalAmount: Number(order.totalAmount ?? order.grandTotal ?? 0),
      cashReceived: order.cashReceived || "",
      createdBy: order.createdBy || "HARSHIT",
      orderDate: order.orderDate || new Date().toISOString(),
      products: JSON.parse(JSON.stringify(order.products || order.items || []))
    });
  };

  // --- Save Updates to the Database Server and Adjust Inventory Stock ---
  const saveOrderEditsToServer = async (e) => {
    e.preventDefault();
    if (!editForm.patientName.trim()) {
      alert("Patient name is required.");
      return;
    }

    const isCash = editForm.paymentMethod.toLowerCase() === "cash";
    const finalCashReceived = isCash ? editForm.cashReceived : editForm.totalAmount;
    const finalChangeReturn = isCash && Number(finalCashReceived) > editForm.totalAmount
      ? (Number(finalCashReceived) - editForm.totalAmount).toFixed(2)
      : "0.00";

    const updatedPayload = {
      ...editForm,
      cashReceived: finalCashReceived,
      changeReturned: finalChangeReturn
    };

    try {
      // 1. Find original order before modifications to get previous stock levels
      const originalOrder = orders.find(o => o.id === editForm.id);
      const originalProducts = originalOrder ? (originalOrder.products || originalOrder.items || []) : [];

      // 2. Commit the edited bill changes to the database
      const res = await fetch(`http://localhost:3000/orders/${editForm.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updatedPayload)
      });

      if (!res.ok) throw new Error("Could not update transaction metrics on server database.");

      // 3. Process Stock Differences for the Inventory
      const stockSyncPromises = editForm.products.map(async (editedProd) => {
        const originalProd = originalProducts.find(p => p.name === editedProd.name);
        
        const oldQty = originalProd ? Number(originalProd.quantity ?? originalProd.qty ?? 0) : 0;
        const newQty = Number(editedProd.quantity ?? editedProd.qty ?? 0);
        
        // Difference logic: if newQty > oldQty, stock decreases. if newQty < oldQty, stock goes up.
        const qtyDifference = newQty - oldQty;

        if (qtyDifference !== 0) {
          try {
            const itemsRes = await fetch("http://localhost:3000/items");
            const itemsData = await itemsRes.json();
            const dbItem = itemsData.find(item => item.name === editedProd.name);

            if (dbItem) {
              const currentStock = Number(dbItem.stock_quantity ?? dbItem.quantity ?? dbItem.stock ?? 0);
              const updatedStockValue = Math.max(0, currentStock - qtyDifference);

              await fetch(`http://localhost:3000/items/${dbItem.id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  stock_quantity: updatedStockValue,
                  quantity: updatedStockValue
                })
              });
            }
          } catch (stockErr) {
            console.error(`Failed to adjust stock metrics for ${editedProd.name}:`, stockErr);
          }
        }
      });

      await Promise.all(stockSyncPromises);

      alert("Order logs updated and inventory stock adjusted successfully!");
      setEditingOrderId(null);
      setEditForm(null);
      fetchOrders(); 
    } catch (err) {
      console.error(err);
      alert("Error committing payload adjustments or syncing inventory records.");
    }
  };

  // --- Native Web Print Lifecycle Execution ---
  const triggerPrintPipeline = (order) => {
    setActivePrintTarget(order);
    setTimeout(() => {
      window.print();
    }, 350);
  };

  // --- Download Order Data Blob File Structure ---
  const downloadSingleOrderDataFile = (order) => {
    const productsList = order.products || order.items || [];
    const plainTextMetadata = `
==================================================
              INVOICE DATA DOWNLOAD
==================================================
MEMO NO        : ${order.cashMemoNo || "N/A"}
ORDER REFERENCE: #${order.id}
PATIENT NAME   : ${(order.patientName || "Walk-In").toUpperCase()}
PHONE NUMBER   : ${order.patientPhone || "N/A"}
ADDRESS        : ${order.patientAddress || "N/A"}
PRESCRIBED BY  : ${order.doctorName || "N/A"}
DATE & TIME    : ${formatOrderDate(order.orderDate || order.createdAt)}
--------------------------------------------------
ITEMS DETAILS:
${productsList.map((p, i) => `${i + 1}. ${p.name} | Qty: ${p.quantity ?? p.qty ?? 1} | Rate: ₹${Number(p.rate || 0).toFixed(2)}`).join("\n")}
--------------------------------------------------
PAYMENT METHOD : ${order.paymentMethod || "Cash"}
GRAND TOTAL    : ₹${Number(order.totalAmount ?? order.grandTotal ?? 0).toFixed(2)}
CASH RECEIVED  : ₹${Number(order.cashReceived || 0).toFixed(2)}
CHANGE RETURN  : ₹${Number(order.changeReturned || 0).toFixed(2)}
PROCESSED BY   : ${order.createdBy || "System Machine"}
==================================================
`;
    const dataBlob = new Blob([plainTextMetadata], { type: "text/plain;charset=utf-8;" });
    const downloadAnchor = document.createElement("a");
    downloadAnchor.href = URL.createObjectURL(dataBlob);
    downloadAnchor.download = `Invoice_Memo_${order.cashMemoNo || order.id}.txt`;
    downloadAnchor.click();
  };

  // --- Dashboard Aggregations calculations ---
  const stats = orders.reduce(
    (acc, order) => {
      const amount = Number(order.totalAmount ?? order.grandTotal ?? 0);
      const method = (order.paymentMethod || "cash").toLowerCase();
      if (method === "cash") acc.cash += amount;
      else if (method === "upi") acc.upi += amount;
      else if (method === "card") acc.card += amount;
      acc.orders += 1;
      return acc;
    },
    { cash: 0, upi: 0, card: 0, orders: 0 }
  );

  // --- Live Filters & Search Queries Resolution Engine ---
  const matchesSearchAndFilter = orders.filter((order) => {
    const pName = (order.patientName || "").toLowerCase();
    const memoId = String(order.cashMemoNo || "").toLowerCase();
    const dbId = String(order.id || "").toLowerCase();
    const searchClean = searchQuery.toLowerCase().trim();

    const matchedSearchTerm = pName.includes(searchClean) || memoId.includes(searchClean) || dbId.includes(searchClean);

    const paymentMethodMatch = (order.paymentMethod || "").toLowerCase();
    if (["cash", "upi", "card"].includes(sortBy)) {
      return matchedSearchTerm && paymentMethodMatch === sortBy;
    }
    return matchedSearchTerm;
  });

  const sortedOrders = [...matchesSearchAndFilter].sort((a, b) => {
    const totalA = Number(a.totalAmount ?? a.grandTotal ?? 0);
    const totalB = Number(b.totalAmount ?? b.grandTotal ?? 0);
    const dateA = a.orderDate ?? a.createdAt ?? "";
    const dateB = b.orderDate ?? b.createdAt ?? "";

    switch (sortBy) {
      case "oldest": return getDateValue(dateA) - getDateValue(dateB);
      case "highest": return totalB - totalA;
      case "lowest": return totalA - totalB;
      default: return getDateValue(dateB) - getDateValue(dateA);
    }
  });

  if (loading) {
    return <div className="loader">Loading Order History...</div>;
  }

  return (
    <div className="orders-container">
      {/* SCREEN PANELS SECTION VIEWPORTS */}
      <div className="screen-only-view">
        <h1 className="orders-title">All Placed Orders Dashboard</h1>

        <div className="payment-summary">
          <div className="summary-card cash-card"><h3>Cash Collection</h3><p>₹{stats.cash.toFixed(2)}</p></div>
          <div className="summary-card upi-card"><h3>UPI Collection</h3><p>₹{stats.upi.toFixed(2)}</p></div>
          <div className="summary-card card-summary-card"><h3>Card Collection</h3><p>₹{stats.card.toFixed(2)}</p></div>
          <div className="summary-card orders-card"><h3>Total Orders</h3><p>{stats.orders}</p></div>
        </div>

        {/* CONTROLS TOOLBAR AND SEARCH ROW PIPELINE */}
        <div className="orders-toolbar-grid">
          <input
            type="text"
            className="search-orders-input"
            placeholder="Search by Patient Name, Memo No, or Order Reference ID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <select className="sort-select" value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
            <option value="newest">Newest First</option>
            <option value="oldest">Oldest First</option>
            <option value="highest">Highest Amount</option>
            <option value="lowest">Lowest Amount</option>
            <option value="cash">Cash Payments</option>
            <option value="upi">UPI Payments</option>
            <option value="card">Card Payments</option>
          </select>
        </div>

        {/* MAIN DATA RENDERING ENGINE */}
        <div className="table-responsive">
          <table className="orders-table">
            <thead>
              <tr>
                <th>Memo / ID</th>
                <th>Date & Time</th>
                <th>Patient Details</th>
                <th>Items Purchased Summary</th>
                <th>Grand Total</th>
                <th>Method</th>
                <th>Actions Workflow Pipeline</th>
              </tr>
            </thead>
            <tbody>
              {sortedOrders.length === 0 ? (
                <tr><td colSpan="7" className="no-data">No matching orders records found inside database log file stacks.</td></tr>
              ) : (
                sortedOrders.map((order) => {
                  const productList = order.products || order.items || [];
                  const isCurrentEditingTarget = editingOrderId === order.id;

                  if (isCurrentEditingTarget) {
                    return (
                      <tr key={order.id} className="editing-row-active-highlight">
                        <td colSpan="7">
                          <form onSubmit={saveOrderEditsToServer} className="inline-modifier-form-card">
                            <h3>Modify Record Parameters: Memo #{editForm.cashMemoNo}</h3>
                            <div className="form-fields-horizontal-row">
                              <div className="form-cell"><label>Patient Name</label>
                                <input type="text" value={editForm.patientName} onChange={(e) => setEditForm({...editForm, patientName: e.target.value})} />
                              </div>
                              <div className="form-cell"><label>Phone</label>
                                <input type="text" value={editForm.patientPhone} onChange={(e) => setEditForm({...editForm, patientPhone: e.target.value})} />
                              </div>
                              <div className="form-cell"><label>Address</label>
                                <input type="text" value={editForm.patientAddress} onChange={(e) => setEditForm({...editForm, patientAddress: e.target.value})} />
                              </div>
                              <div className="form-cell"><label>Doctor Name</label>
                                <input type="text" value={editForm.doctorName} onChange={(e) => setEditForm({...editForm, doctorName: e.target.value})} />
                              </div>
                              <div className="form-cell"><label>Payment Mode</label>
                                <select value={editForm.paymentMethod} onChange={(e) => setEditForm({...editForm, paymentMethod: e.target.value})}>
                                  <option value="Cash">Cash</option><option value="UPI">UPI</option><option value="Card">Card</option>
                                </select>
                              </div>
                            </div>

                            <div className="editing-products-items-list-block">
                              <h4>Adjust Products Quantities Constraints:</h4>
                              {editForm.products.map((prod, pIdx) => (
                                <div key={pIdx} className="inline-product-edit-row">
                                  <span className="prod-name-lbl"><strong>{prod.name}</strong> (₹{Number(prod.rate || 0).toFixed(2)})</span>
                                  <div className="qty-control-wrapper">
                                    <label>Qty:</label>
                                    <input type="number" min="1" value={prod.quantity ?? prod.qty ?? 1} onChange={(e) => handleEditItemQtyChange(pIdx, e.target.value)} />
                                  </div>
                                </div>
                              ))}
                            </div>

                            <div className="edit-form-accounting-row">
                              {editForm.paymentMethod.toLowerCase() === 'cash' && (
                                <div className="cash-input-field">
                                  <label>Cash Received Counter:</label>
                                  <input type="number" value={editForm.cashReceived} onChange={(e) => setEditForm({...editForm, cashReceived: e.target.value})} />
                                </div>
                              )}
                              <div className="live-grand-total-label">Recalculated Bill Total: <strong>₹{editForm.totalAmount}</strong></div>
                            </div>

                            <div className="action-buttons-group-row">
                              <button type="submit" className="save-edit-btn-action">Save Logs</button>
                              <button type="button" className="cancel-edit-btn-action" onClick={() => { setEditingOrderId(null); setEditForm(null); }}>Cancel</button>
                            </div>
                          </form>
                        </td>
                      </tr>
                    );
                  }

                  return (
                    <tr key={order.id}>
                      <td className="order-id">
                        <strong style={{ color: '#0f172a' }}>M-{order.cashMemoNo || "N/A"}</strong>
                        <span className="sub-db-id">#{String(order.id).slice(0, 8)}</span>
                      </td>
                      <td>{formatOrderDate(order.orderDate ?? order.createdAt)}</td>
                      <td>
                        <div className="patient-summary-cell">
                          <strong>{order.patientName?.toUpperCase() || "WALK-IN CUSTOMER"}</strong>
                          {order.patientPhone && <span className="sub-phone">Ph: {order.patientPhone}</span>}
                        </div>
                      </td>
                      <td>
                        <div className="products-cell">
                          {productList.map((prod, idx) => (
                            <div key={idx} className="product-item-row">
                              • {prod.name} <span className="qty-badge">x{prod.quantity ?? prod.qty ?? 1}</span>
                            </div>
                          ))}
                        </div>
                      </td>
                      <td className="amount-cell">₹{Number(order.totalAmount ?? order.grandTotal ?? 0).toFixed(2)}</td>
                      <td>
                        <span className={`payment-badge payment-${(order.paymentMethod || "cash").toLowerCase()}`}>
                          {order.paymentMethod || "Cash"}
                        </span>
                      </td>
                      <td>
                        <div className="action-buttons-workflow-flex-row">
                          <button className="ctrl-workflow-btn edit-action" onClick={() => startEditingOrder(order)}>Edit Bill</button>
                          <button className="ctrl-workflow-btn print-action" onClick={() => triggerPrintPipeline(order)}>Print Bill</button>
                          <button className="ctrl-workflow-btn download-action" onClick={() => downloadSingleOrderDataFile(order)}>Download</button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* --- INJECTED SYSTEM PRINT DISPLAY LAYOUT PIPELINE --- */}
      {activePrintTarget && (
        <div className="print-only-layout-engine">
          <div className="invoice-box-border">
            <div className="gst-header-row"><span>GSTIN: {shopDetails.gstin}</span><span>D.L.No.: {shopDetails.dlNo}</span></div>
            <div className="center-invoice-title">
              <div className="invoice-type-header">RETAIL INVOICE / CASH MEMO RECORD</div>
              <h1 className="print-brand-main">{shopDetails.name}</h1>
              <p className="print-sub-address">{shopDetails.address}</p>
              <p className="print-sub-address">Ph. {shopDetails.phone}</p>
              <div className="print-divider-lines">====================================================================</div>
            </div>

            <div className="meta-details-table">
              <div className="meta-col">
                <p><span>CASH MEMO NO.</span><span>: {activePrintTarget.cashMemoNo || "N/A"}</span></p>
                <p><span>PATIENT NAME</span><span>: {(activePrintTarget.patientName || "WALK-IN").toUpperCase()}</span></p>
                <p><span>PATIENT ADD</span><span>: {(activePrintTarget.patientAddress || "N/A").toUpperCase()}</span></p>
                <p><span>PRESCRIBED BY</span><span>: {(activePrintTarget.doctorName || "N/A").toUpperCase()}</span></p>
              </div>
              <div className="meta-col text-right">
                <p>DATE : &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;{new Date(activePrintTarget.orderDate || activePrintTarget.createdAt).toLocaleDateString("en-GB")}</p>
                <p style={{ fontSize: "11px", marginTop: "4px" }}>MODE : {(activePrintTarget.paymentMethod || "Cash").toUpperCase()}</p>
              </div>
            </div>

            <table className="items-invoice-table">
              <thead>
                <tr>
                  <th style={{ textAlign: "left" }}>PARTICULARS</th>
                  <th>PACK</th>
                  <th>QTY</th>
                  <th>BATCH No.</th>
                  <th>Exp.</th>
                  <th>GST%</th>
                  <th>RATE</th>
                  <th style={{ textAlign: "right" }}>Amount</th>
                </tr>
              </thead>
              <tbody>
                {(activePrintTarget.products || activePrintTarget.items || []).map((item, i) => {
                  const itemQtyResolved = Number(item.quantity ?? item.qty ?? 1);
                  const itemRateResolved = Number(item.rate || 0);
                  const itemTotalCalculated = itemQtyResolved * itemRateResolved;
                  return (
                    <tr key={i}>
                      <td style={{ textAlign: "left" }}>{(item.name || "").toUpperCase()}</td>
                      <td>{item.pack || "10TAB"}</td>
                      <td>{itemQtyResolved}</td>
                      <td>{item.batch || "N/A"}</td>
                      <td>{item.exp || "N/A"}</td>
                      <td>{Number(item.gst || 0).toFixed(2)}</td>
                      <td>{itemRateResolved.toFixed(2)}</td>
                      <td style={{ textAlign: "right" }}>{itemTotalCalculated.toFixed(2)}</td>
                    </tr>
                  );
                })}
                {[...Array(Math.max(0, 5 - (activePrintTarget.products || activePrintTarget.items || []).length))].map((_, i) => (
                  <tr key={i} className="empty-row"><td colSpan="8">&nbsp;</td></tr>
                ))}
              </tbody>
            </table>

            <div className="recovery-message">WISH YOU A FASTER RECOVERY</div>
            <div className="tax-exemption-notice">" COMPOSITION TAXABLE PERSON, NOT ELIGIBLE TO COLLECT TAX ON SUPPLIES "</div>

            <div className="invoice-footer-grid">
              <div className="footer-left-gst">
                <p>All disputes are subject to Delhi Jurisdiction. Prices inclusive of tax.</p>
                <p>Genuine products sold under pharmacist supervision.</p>
                <p>Goods once sold will not be taken back.</p>
              </div>
              <div className="footer-right-totals">
                <div className="total-row-item net-final-bold">
                  <span>Net Amt Total:</span> 
                  <span>₹{Number(activePrintTarget.totalAmount ?? activePrintTarget.grandTotal ?? 0).toFixed(2)}</span>
                </div>
                <div className="total-row-item" style={{ fontSize: '11px', color: '#444' }}>
                  <span>PAID VIA {(activePrintTarget.paymentMethod || "Cash").toUpperCase()}:</span> 
                  <span>₹{Number(activePrintTarget.cashReceived || activePrintTarget.totalAmount || 0).toFixed(2)}</span>
                </div>
                {activePrintTarget.paymentMethod?.toLowerCase() === 'cash' && (
                  <div className="total-row-item" style={{ fontSize: '11px', color: '#444' }}>
                    <span>CHANGE RETURNED:</span> 
                    <span>₹{activePrintTarget.changeReturned || "0.00"}</span>
                  </div>
                )}
                <div className="authorized-sign-box">
                  <p>For RAKESH MEDICOS</p>
                  <div style={{ height: "20px" }}></div>
                  <p className="sign-user-tag">({activePrintTarget.createdBy || "HARSHIT"})</p>
                </div>
              </div>
            </div>
            <p className="computer-generated-tag">(Computer Re-Printed Invoice Log File)</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default AllOrders;