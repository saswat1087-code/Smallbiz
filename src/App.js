const addOrder = async () => {
  if (!newOrder.order_id || !newOrder.customer) {
    setMessage('❌ Please fill in Order ID and Customer');
    return;
  }
  setSaving(true);
  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        order_id: newOrder.order_id,
        customer: newOrder.customer,
        status: 'Open',
        created_at: new Date().toISOString()
      })
    });
    
    if (response.ok) {
      const createdOrder = await response.json();
      console.log('Created order with ID:', createdOrder);
      
      setNewOrder({ order_id: '', customer: '' });
      setMessage('✅ Order created successfully!');
      
      // Reload data to get the new order with its ID
      await loadData();
    } else {
      const errorText = await response.text();
      console.error('Create order failed:', errorText);
      setMessage('❌ Failed to create order');
    }
  } catch (error) {
    console.error('Error creating order:', error);
    setMessage('❌ Failed to create order');
  } finally {
    setSaving(false);
  }
};
