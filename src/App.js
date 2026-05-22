const loadData = async () => {
  try {
    setLoading(true);
    const response = await fetch(API_URL);
    const allData = await response.json();
    
    // Explicitly map Sheet.best's '__row_number__' to an 'id' key for your UI checks
    const stockData = allData
      .filter(row => row.sku && row.sku !== '' && !row.order_id)
      .map(row => ({ ...row, id: row.__row_number__ }));

    const binsData = allData
      .filter(row => row.bin_id && row.bin_id !== '')
      .map(row => ({ ...row, id: row.__row_number__ }));

    const ordersData = allData
      .filter(row => row.order_id && row.order_id !== '')
      .map(row => ({ ...row, id: row.__row_number__ })); // <-- This fixes your warning
    
    setStock(stockData);
    setBins(binsData);
    setOrders(ordersData);
  } catch (error) {
    console.error('Error loading data:', error);
    setMessage('❌ Failed to load data');
  } finally {
    setLoading(false);
  }
};
