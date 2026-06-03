import { useState, useEffect, useContext } from "react";
import { AuthContext } from "../context/AuthContext";
import "./Order.css";

function Order() {
  const { user } = useContext(AuthContext);

  const shopDetails = {
    name: "RAKESH MEDICOS",
    address: "RZD, 258A, RAJ NAGAR PART 2, PALAM COLONY, NEW DELHI 110077, NEAR NEW GURUDWARA",
    phone: "8010211317; 9810848820",
    gstin: "07AABPY1653L1ZC",
    dlNo: "PLM-119119-20, 119120-21",
  };

  const [inventoryItems, setInventoryItems] = useState([]);
  const [barcodeInput, setBarcodeInput] = useState("");
  const [activeTab, setActiveTab] = useState(1);
  const [showPrintModal, setShowPrintModal] = useState(false);
  const [printSnapshot, setPrintSnapshot] = useState(null);

  const [tabsData, setTabsData] = useState({
    1: { patientName: "", patientPhone: "", patientAddress: "", docName: "", discountPercent: 0, cashReceived: "", paymentMethod: "Cash", items: [], cashMemoNo: Math.floor(1000 + Math.random() * 9000) },
    2: { patientName: "", patientPhone: "", patientAddress: "", docName: "", discountPercent: 0, cashReceived: "", paymentMethod: "Cash", items: [], cashMemoNo: Math.floor(1000 + Math.random() * 9000) },
    3: { patientName: "", patientPhone: "", patientAddress: "", docName: "", discountPercent: 0, cashReceived: "", paymentMethod: "Cash", items: [], cashMemoNo: Math.floor(1000 + Math.random() * 9000) },
  });

  useEffect(() => {
    fetch("http://localhost:3000/items")
      .then((res) => res.json())
      .then((data) => setInventoryItems(data || []))
      .catch((err) => console.error("Error fetching stock:", err));
  }, []);

  const currentTab = tabsData[activeTab];

  const updateCurrentTabFields = (updatedFields) => {
    setTabsData({
      ...tabsData,
      [activeTab]: { ...currentTab, ...updatedFields },
    });
  };

  const handleBarcodeSubmit = (e) => {
    e.preventDefault();
    if (!barcodeInput.trim()) return;

    const match = inventoryItems.find(
      (item) =>
        item.barcode === barcodeInput.trim() ||
        item.name.toLowerCase().includes(barcodeInput.toLowerCase()),
    );

    if (match) {
      const existingItemIndex = currentTab.items.findIndex((item) => item.id === match.id);
      let updatedItems = [...currentTab.items];

      const currentAvailableStock = Number(match.stock_quantity ?? match.quantity ?? match.stock ?? 0);
      const currentlyInCart = existingItemIndex > -1 ? updatedItems[existingItemIndex].qty : 0;

      if (currentlyInCart >= currentAvailableStock) {
        alert(`Cannot add more item units! Only ${currentAvailableStock} items left in stock.`);
        setBarcodeInput("");
        return;
      }

      if (existingItemIndex > -1) {
        updatedItems[existingItemIndex].qty += 1;
      } else {
        updatedItems.push({
          id: match.id,
          name: match.name,
          barcode: match.barcode || "N/A",
          pack: match.pack || "10TAB",
          batch: match.batch || "B" + Math.floor(100000 + Math.random() * 900000),
          exp: match.expiry_date || "01/28",
          rate: Number(match.price || 0),
          qty: 1,
          gst: 0.0,
          currentInventoryStock: currentAvailableStock
        });
      }
      updateCurrentTabFields({ items: updatedItems });
      setBarcodeInput("");
    } else {
      alert("Product not found in inventory scan system.");
    }
  };

  const removeItemFromCart = (index) => {
    const updatedItems = currentTab.items.filter((_, i) => i !== index);
    updateCurrentTabFields({ items: updatedItems });
  };

  const updateItemQty = (index, value) => {
    const updatedItems = [...currentTab.items];
    const targetItem = updatedItems[index];
    const requestedQty = Math.max(1, Number(value || 1));
    
    if (requestedQty > targetItem.currentInventoryStock) {
      alert(`Requested units exceed stock! Max available: ${targetItem.currentInventoryStock}`);
      targetItem.qty = targetItem.currentInventoryStock;
    } else {
      targetItem.qty = requestedQty;
    }
    updateCurrentTabFields({ items: updatedItems });
  };

  const subtotal = currentTab.items.reduce((sum, item) => sum + item.rate * item.qty, 0);
  const discountAmount = subtotal * (Number(currentTab.discountPercent || 0) / 100);
  const grandTotalRounded = Math.round(subtotal - discountAmount);
  
  const isCashPayment = currentTab.paymentMethod.toLowerCase() === "cash";
  const displayCashReceived = isCashPayment ? currentTab.cashReceived : grandTotalRounded;
  const changeReturnAmt = isCashPayment && Number(currentTab.cashReceived) > grandTotalRounded
    ? (Number(currentTab.cashReceived) - grandTotalRounded).toFixed(2)
    : "0.00";

  const handleOpenConfirmation = () => {
    if (currentTab.items.length === 0) {
      alert("Cannot generate an empty bill!");
      return;
    }
    if (!currentTab.patientName.trim()) {
      alert("Please enter a patient name before generating the receipt.");
      return;
    }
    if (isCashPayment && (!currentTab.cashReceived || Number(currentTab.cashReceived) < grandTotalRounded)) {
      alert(`Please enter a valid Cash Amount equal to or greater than ₹${grandTotalRounded}`);
      return;
    }

    setPrintSnapshot({
      ...currentTab,
      subtotal,
      grandTotalRounded,
      displayCashReceived,
      changeReturnAmt
    });
    
    setShowPrintModal(true);
  };

  const processFinalizeOrderAndBill = async (shouldPrintReceipt) => {
    setShowPrintModal(false);
    const orderToSave = printSnapshot || { ...currentTab, subtotal, grandTotalRounded, displayCashReceived, changeReturnAmt };

    const transformedProducts = orderToSave.items.map(item => ({
      name: item.name,
      quantity: Number(item.qty || 1),
      pack: item.pack,
      batch: item.batch,
      exp: item.exp,
      gst: item.gst,
      rate: Number(item.rate || 0)
    }));

    const packedOrderPayload = {
      cashMemoNo: orderToSave.cashMemoNo,
      patientName: orderToSave.patientName,
      patientPhone: orderToSave.patientPhone,
      patientAddress: orderToSave.patientAddress,
      doctorName: orderToSave.docName || "N/A",
      products: transformedProducts,                 
      totalAmount: orderToSave.grandTotalRounded,                
      orderDate: new Date().toISOString(),           
      paymentMethod: orderToSave.paymentMethod,
      createdBy: user?.username || "HARSHIT",        
      cashReceived: orderToSave.displayCashReceived,
      changeReturned: orderToSave.changeReturnAmt
    };

    try {
      const response = await fetch("http://localhost:3000/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(packedOrderPayload)
      });

      if (!response.ok) throw new Error("Failed to persist order entry data to local server.");

      const serverSyncPromises = orderToSave.items.map((cartItem) => {
        const originalDbStock = cartItem.currentInventoryStock;
        const targetNewStockCalculated = Math.max(0, originalDbStock - cartItem.qty);

        return fetch(`http://localhost:3000/items/${cartItem.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            stock_quantity: targetNewStockCalculated,
            quantity: targetNewStockCalculated
          })
        }).catch(err => console.error(`Error updating server stock on item ID: ${cartItem.id}`, err));
      });

      await Promise.all(serverSyncPromises);

      setInventoryItems(prevInventory => {
        return prevInventory.map(invItem => {
          const matchingCartItem = orderToSave.items.find(cartItem => cartItem.id === invItem.id);
          if (matchingCartItem) {
            const currentStockField = Number(invItem.stock_quantity ?? invItem.quantity ?? 0);
            const absoluteBalanceAmt = Math.max(0, currentStockField - matchingCartItem.qty);
            return { ...invItem, stock_quantity: absoluteBalanceAmt, quantity: absoluteBalanceAmt };
          }
          return invItem;
        });
      });

      if (shouldPrintReceipt) {
        setTimeout(() => { window.print(); setPrintSnapshot(null); }, 350);
      } else {
        setPrintSnapshot(null);
      }

      alert(`Order Finalized and Logged successfully! Memo No: ${orderToSave.cashMemoNo}`);

      setTabsData(prevTabs => ({
        ...prevTabs,
        [activeTab]: {
          patientName: "", patientPhone: "", patientAddress: "", docName: "",
          discountPercent: 0, cashReceived: "", paymentMethod: "Cash", items: [],
          cashMemoNo: Math.floor(1000 + Math.random() * 9000),
        }
      }));

    } catch (err) {
      console.error(err);
      alert("Failed to safely complete order transaction Procedures with local backend server database.");
    }
  };

  const activePrintSource = printSnapshot || currentTab;

  return (
    <div className="page-container">
      <div className="screen-only-view">
        <div className="tabs-header-row">
          {[1, 2, 3].map((tabNum) => (
            <button
              key={tabNum}
              className={`tab-btn ${activeTab === tabNum ? "active-tab" : ""}`}
              onClick={() => setActiveTab(tabNum)}
            >
              Customer Cart {tabNum} ({tabsData[tabNum].items.length})
            </button>
          ))}
        </div>

        <h1 className="billing-system-title">Barcode Billing System (Tab {activeTab})</h1>

        <div className="billing-workspace-layout">
          <div className="left-workspace-panel">
            <form onSubmit={handleBarcodeSubmit} className="barcode-input-container">
              <input
                type="text"
                placeholder={`Scan product barcode or type medicine name...`}
                value={barcodeInput}
                onChange={(e) => setBarcodeInput(e.target.value)}
                autoFocus
              />
              <button type="submit" className="add-product-action-btn">Add Item</button>
            </form>

            <div className="basket-table-wrapper">
              <table className="basket-data-table">
                <thead>
                  <tr>
                    <th>BARCODE</th>
                    <th>PRODUCT</th>
                    <th>PRICE</th>
                    <th>QTY</th>
                    <th>TOTAL</th>
                    <th>ACTION</th>
                  </tr>
                </thead>
                <tbody>
                  {currentTab.items.length === 0 ? (
                    <tr><td colSpan="6" className="empty-basket-text">Basket is empty.</td></tr>
                  ) : (
                    currentTab.items.map((item, index) => (
                      <tr key={index}>
                        <td className="barcode-cell-dim">{item.barcode}</td>
                        <td className="product-title-bold-cell">{item.name}</td>
                        <td>₹{Number(item.rate).toFixed(2)}</td>
                        <td>
                          <input
                            type="number"
                            className="table-qty-input"
                            value={item.qty}
                            min="1"
                            onChange={(e) => updateItemQty(index, e.target.value)}
                          />
                        </td>
                        <td className="item-row-total-accent">₹{(item.rate * item.qty).toFixed(2)}</td>
                        <td>
                          <button type="button" onClick={() => removeItemFromCart(index)} className="table-row-delete-btn">Remove</button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="right-workspace-panel side-billing-summary-card">
            <h3>Billing Summary: Customer {activeTab}</h3>
            <div className="side-panel-inputs-form">
              <div className="summary-input-group"><label>Patient Name *</label>
                <input type="text" value={currentTab.patientName} onChange={(e) => updateCurrentTabFields({ patientName: e.target.value })} placeholder="Name" />
              </div>
              <div className="summary-input-group"><label>Address</label>
                <input type="text" value={currentTab.patientAddress} onChange={(e) => updateCurrentTabFields({ patientAddress: e.target.value })} placeholder="Address" />
              </div>
              <div className="summary-input-group"><label>Phone Number</label>
                <input type="text" value={currentTab.patientPhone} onChange={(e) => updateCurrentTabFields({ patientPhone: e.target.value })} placeholder="Phone" />
              </div>
              <div className="summary-input-group"><label>Prescribed By</label>
                <input type="text" value={currentTab.docName} onChange={(e) => updateCurrentTabFields({ docName: e.target.value })} placeholder="Doctor Name" />
              </div>
              <div className="summary-input-group"><label>Payment Mode</label>
                <select className="payment-select-dropdown" value={currentTab.paymentMethod} onChange={(e) => updateCurrentTabFields({ paymentMethod: e.target.value })}>
                  <option value="Cash">Cash</option><option value="UPI">UPI</option><option value="Card">Card</option>
                </select>
              </div>
            </div>

            <hr className="side-summary-divider" />

            <div className="accounting-metrics-rows">
              <div className="metric-summary-row"><span>Subtotal</span><strong>₹{subtotal.toFixed(2)}</strong></div>
              <div className="metric-summary-row"><span>Discount %</span>
                <input type="number" className="side-discount-numeric-box" value={currentTab.discountPercent} onChange={(e) => updateCurrentTabFields({ discountPercent: Number(e.target.value) })} />
              </div>
              <div className="metric-summary-row grand-total-highlight-row"><span>Grand Total</span><strong>₹{grandTotalRounded.toFixed(2)}</strong></div>
              
              {isCashPayment ? (
                <>
                  <div className="summary-input-group" style={{ marginTop: "12px" }}><label>Cash Received *</label>
                    <input type="number" value={currentTab.cashReceived} onChange={(e) => updateCurrentTabFields({ cashReceived: e.target.value })} placeholder="₹0.00" />
                  </div>
                  <div className="metric-summary-row change-return-highlight-row"><span>CHANGE RETURN</span><strong>₹{changeReturnAmt}</strong></div>
                </>
              ) : (
                <div className="digital-payment-notice">Selected: <strong>{currentTab.paymentMethod.toUpperCase()}</strong>. Balanced collected via terminal processing machine.</div>
              )}
            </div>

            <button onClick={handleOpenConfirmation} className="generate-bill-action-trigger-btn">Generate Bill (Customer {activeTab})</button>
          </div>
        </div>
      </div>

      {showPrintModal && (
        <div className="bill-generation-overlay-modal">
          <div className="bill-generation-modal-card">
            <h2>Finalize Order Request</h2>
            <p>Do you want to print a physical paper invoice copy for <strong>{(printSnapshot?.patientName || "").toUpperCase()}</strong>?</p>
            <div className="modal-actions-wrapper-row">
              <button onClick={() => processFinalizeOrderAndBill(true)} className="modal-btn confirm-print-btn">Yes, Save & Print Bill</button>
              <button onClick={() => processFinalizeOrderAndBill(false)} className="modal-btn skip-print-btn">No, Save Order Only</button>
              <button onClick={() => { setShowPrintModal(false); setPrintSnapshot(null); }} className="modal-btn cancel-process-btn">Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* PHYSICAL PRINT ENGINE DESIGN LAYOUT */}
      <div className="print-only-layout-engine">
        <div className="invoice-box-border">
          <div className="gst-header-row"><span>GSTIN: {shopDetails.gstin}</span><span>D.L.No.: {shopDetails.dlNo}</span></div>
          <div className="center-invoice-title">
            <div className="invoice-type-header">RETAIL INVOICE/CASH MEMO</div>
            <h1 className="print-brand-main">{shopDetails.name}</h1>
            <p className="print-sub-address">{shopDetails.address}</p>
            <p className="print-sub-address">Ph. {shopDetails.phone}</p>
            <div className="print-divider-lines">====================================================================</div>
          </div>

          <div className="meta-details-table">
            <div className="meta-col">
              <p><span>CASH MEMO NO.</span><span>: {activePrintSource.cashMemoNo}</span></p>
              <p><span>PATIENT NAME</span><span>: {(activePrintSource.patientName || "WALK-IN CUSTOMER").toUpperCase()}</span></p>
              <p><span>PATIENT ADD</span><span>: {(activePrintSource.patientAddress || "N/A").toUpperCase()}</span></p>
              <p><span>PRESCRIBED BY</span><span>: {(activePrintSource.docName || "N/A").toUpperCase()}</span></p>
            </div>
            <div className="meta-col text-right">
              <p>DATE : &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;{new Date().toLocaleDateString("en-GB")}</p>
              <p style={{ fontSize: "11px", marginTop: "4px" }}>MODE : {activePrintSource.paymentMethod.toUpperCase()}</p>
            </div>
          </div>

          <table className="items-invoice-table">
            <thead>
              <tr>
                <th style={{ textAlign: "left" }}>PARTICULARS</th><th>PACK</th><th>QTY</th><th>BATCH No.</th><th>Exp.</th><th>GST%</th><th>RATE</th><th style={{ textAlign: "right" }}>Amount</th>
              </tr>
            </thead>
            <tbody>
              {activePrintSource.items.map((item, i) => {
                const itemRawTotal = item.rate * item.qty;
                const itemDisc = itemRawTotal * (Number(activePrintSource.discountPercent || 0) / 100);
                return (
                  <tr key={i}>
                    <td style={{ textAlign: "left" }}>{item.name.toUpperCase()}</td><td>{item.pack}</td><td>{item.qty}</td><td>{item.batch}</td><td>{item.exp}</td><td>{Number(item.gst).toFixed(2)}</td><td>{Number(item.rate).toFixed(2)}</td><td style={{ textAlign: "right" }}>{(itemRawTotal - itemDisc).toFixed(2)}</td>
                  </tr>
                );
              })}
              {[...Array(Math.max(0, 6 - activePrintSource.items.length))].map((_, i) => (
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
              <div className="total-row-item"><span>TOTAL AMOUNT :</span> <span>{(printSnapshot ? printSnapshot.subtotal : subtotal).toFixed(2)}</span></div>
              <div className="total-row-item net-final-bold"><span>Net Amt.(R/O):</span> <span>{(printSnapshot ? printSnapshot.grandTotalRounded : grandTotalRounded).toFixed(2)}</span></div>
              <div className="total-row-item" style={{ fontSize: '11px', color: '#333' }}><span>PAID VIA {activePrintSource.paymentMethod.toUpperCase()}:</span> <span>₹{Number(printSnapshot ? printSnapshot.displayCashReceived : displayCashReceived).toFixed(2)}</span></div>
              {isCashPayment && (
                <div className="total-row-item" style={{ fontSize: '11px', color: '#333' }}><span>CHANGE RETURNED:</span> <span>₹{printSnapshot ? printSnapshot.changeReturnAmt : changeReturnAmt}</span></div>
              )}
              <div className="authorized-sign-box"><p>For RAKESH MEDICOS</p><div style={{ height: "25px" }}></div><p className="sign-user-tag">({user?.username || "HARSHIT"})</p></div>
            </div>
          </div>
          <p className="computer-generated-tag">(Computer Generated Invoice)</p>
        </div>
      </div>
    </div>
  );
}

export default Order;