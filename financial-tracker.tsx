import React, { useState, useCallback, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell, ScatterChart, Scatter } from 'recharts';
import { Upload, TrendingUp, TrendingDown, DollarSign, Calendar, FileText, X, Edit2, Save, Filter, Brain, Eye, EyeOff, Search, Plus, Trash2, BarChart3, RefreshCw, Download, FolderOpen } from 'lucide-react';
import Papa from 'papaparse';

const FinancialTracker = () => {
  const [statements, setStatements] = useState([]);
  const [monthlyData, setMonthlyData] = useState([]);
  const [categoryData, setCategoryData] = useState([]);
  const [allTransactions, setAllTransactions] = useState([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  const [editingTransaction, setEditingTransaction] = useState(null);
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [dateFilter, setDateFilter] = useState({ start: '', end: '' });
  const [learningModel, setLearningModel] = useState(new Map());
  const [selectedCategories, setSelectedCategories] = useState(new Set());
  const [customCategories, setCustomCategories] = useState([]);
  const [showAddCategory, setShowAddCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryParent, setNewCategoryParent] = useState('');
  const [showMonthlySummary, setShowMonthlySummary] = useState(true);
  const [showRefundMatching, setShowRefundMatching] = useState(true);
  const [selectedUser, setSelectedUser] = useState('combined');
  const [availableUsers, setAvailableUsers] = useState([]);
  const [summary, setSummary] = useState({
    totalIncome: 0,
    totalExpenses: 0,
    totalSavings: 0,
    avgMonthlySpending: 0
  });

  const PREDEFINED_CATEGORIES = [
    'Digital Entertainment', 'Entertainment', 'Food & Dining', 'Groceries',
    'Transportation - Parking', 'Transportation - Cab/Rideshare', 'Transportation - Fuel', 
    'Transportation - Tolls', 'Transportation - Public Transit', 'Transportation - Other',
    'Housing & Utilities', 'Shopping', 'Healthcare', 'Education', 'Travel', 'Investments',
    'Insurance', 'Bank Fees', 'Personal Care', 'Gifts & Donations',
    'Subscriptions', 'Phone & Internet', 'Credits/Refunds', 'Other'
  ];

  const BASE_CATEGORIES = [
    'Digital Entertainment', 'Entertainment', 'Food & Dining', 'Groceries',
    'Transportation', 'Housing & Utilities', 'Shopping', 'Healthcare', 
    'Education', 'Travel', 'Investments', 'Insurance', 'Bank Fees', 
    'Personal Care', 'Gifts & Donations', 'Subscriptions', 'Phone & Internet', 'Other'
  ];

  const COLORS = ['#8884d8', '#82ca9d', '#ffc658', '#ff7c7c', '#8dd1e1', '#d084d0', '#ffb347', '#87ceeb', '#dda0dd', '#98fb98'];

  // Load saved data on component mount
  useEffect(() => {
    const savedModel = localStorage.getItem('financialTrackerLearningModel');
    if (savedModel) {
      try {
        const parsedModel = JSON.parse(savedModel);
        const modelMap = new Map(Object.entries(parsedModel));
        setLearningModel(modelMap);
      } catch (error) {
        console.error('Error loading saved learning model:', error);
      }
    }

    const savedCategories = localStorage.getItem('financialTrackerCustomCategories');
    if (savedCategories) {
      try {
        const parsedCategories = JSON.parse(savedCategories);
        setCustomCategories(parsedCategories);
      } catch (error) {
        console.error('Error loading saved custom categories:', error);
      }
    }
  }, []);

  // Save learning model and custom categories whenever they change
  useEffect(() => {
    if (learningModel.size > 0) {
      const modelObject = Object.fromEntries(learningModel);
      localStorage.setItem('financialTrackerLearningModel', JSON.stringify(modelObject));
    }
  }, [learningModel]);

  useEffect(() => {
    // Always save custom categories, even if empty array
    localStorage.setItem('financialTrackerCustomCategories', JSON.stringify(customCategories));
  }, [customCategories]);

  // Reprocess data when user selection changes
  useEffect(() => {
    if (allTransactions.length > 0) {
      processData(allTransactions);
    }
  }, [selectedUser]);

  const getAllCategories = () => {
    return [...PREDEFINED_CATEGORIES, ...customCategories].sort();
  };

  const addCustomCategory = () => {
    if (!newCategoryName.trim()) return;
    
    const categoryName = newCategoryParent 
      ? `${newCategoryParent} - ${newCategoryName.trim()}`
      : newCategoryName.trim();
    
    if (!getAllCategories().includes(categoryName)) {
      setCustomCategories(prev => [...prev, categoryName]);
      setNewCategoryName('');
      setNewCategoryParent('');
      setShowAddCategory(false);
    }
  };

  const removeCustomCategory = (categoryToRemove) => {
    setCustomCategories(prev => prev.filter(cat => cat !== categoryToRemove));
    
    // Update any transactions using this category to 'Other'
    const updatedTransactions = allTransactions.map(t => 
      t.category === categoryToRemove ? { ...t, category: 'Other' } : t
    );
    setAllTransactions(updatedTransactions);
    processData(updatedTransactions);
  };
  // Enhanced categorization with learning
  const categorizeTransaction = useCallback((description, amount) => {
    const desc = description.toLowerCase();
    
    // Check if we've learned this merchant before
    const merchant = extractMerchant(desc);
    if (learningModel.has(merchant)) {
      return learningModel.get(merchant);
    }

    // For credit card statements: negative amounts are credits/refunds, positive amounts are charges
    if (amount < 0) {
      return 'Credit/Refund'; // Credits applied to account (refunds, returns, etc.)
    }

    // Enhanced rule-based categorization for spending (positive amounts)
    if (desc.includes('netflix') || desc.includes('spotify') || desc.includes('hulu') || desc.includes('disney+') || desc.includes('amazon prime')) return 'Digital Entertainment';
    if (desc.includes('movie') || desc.includes('theater') || desc.includes('concert') || desc.includes('event')) return 'Entertainment';
    if (desc.includes('restaurant') || desc.includes('cafe') || desc.includes('dining') || desc.includes('pizza') || desc.includes('mcdonald') || desc.includes('starbucks')) return 'Food & Dining';
    if (desc.includes('grocery') || desc.includes('market') || desc.includes('walmart') || desc.includes('target') || desc.includes('costco') || desc.includes('whole foods')) return 'Groceries';
    
    // Transportation subcategories
    if (desc.includes('parking') || desc.includes('meter') || desc.includes('garage') || desc.includes('valet')) return 'Transportation - Parking';
    if (desc.includes('uber') || desc.includes('lyft') || desc.includes('taxi') || desc.includes('cab') || desc.includes('rideshare')) return 'Transportation - Cab/Rideshare';
    if (desc.includes('gas') || desc.includes('fuel') || desc.includes('shell') || desc.includes('exxon') || desc.includes('chevron') || desc.includes('bp') || desc.includes('mobil')) return 'Transportation - Fuel';
    if (desc.includes('toll') || desc.includes('bridge') || desc.includes('turnpike') || desc.includes('fastrak') || desc.includes('ezpass')) return 'Transportation - Tolls';
    if (desc.includes('metro') || desc.includes('subway') || desc.includes('bus') || desc.includes('train') || desc.includes('transit') || desc.includes('mta') || desc.includes('bart')) return 'Transportation - Public Transit';
    if (desc.includes('car rental') || desc.includes('hertz') || desc.includes('enterprise') || desc.includes('avis') || desc.includes('budget') || desc.includes('zipcar')) return 'Transportation - Other';
    
    if (desc.includes('rent') || desc.includes('mortgage') || desc.includes('utilities') || desc.includes('electric') || desc.includes('water')) return 'Housing & Utilities';
    if (desc.includes('amazon') && !desc.includes('prime') || desc.includes('shopping') || desc.includes('mall')) return 'Shopping';
    if (desc.includes('doctor') || desc.includes('pharmacy') || desc.includes('medical') || desc.includes('health')) return 'Healthcare';
    if (desc.includes('school') || desc.includes('university') || desc.includes('education') || desc.includes('tuition')) return 'Education';
    if (desc.includes('hotel') || desc.includes('flight') || desc.includes('airline') || desc.includes('travel')) return 'Travel';
    if (desc.includes('investment') || desc.includes('stock') || desc.includes('bond') || desc.includes('401k')) return 'Investments';
    if (desc.includes('insurance') || desc.includes('premium')) return 'Insurance';
    if (desc.includes('fee') || desc.includes('atm') || desc.includes('overdraft')) return 'Bank Fees';
    if (desc.includes('salon') || desc.includes('spa') || desc.includes('gym') || desc.includes('fitness')) return 'Personal Care';
    if (desc.includes('gift') || desc.includes('donation') || desc.includes('charity')) return 'Gifts & Donations';
    if (desc.includes('subscription') || desc.includes('monthly')) return 'Subscriptions';
    if (desc.includes('phone') || desc.includes('internet') || desc.includes('verizon') || desc.includes('at&t')) return 'Phone & Internet';
    
    return 'Other';
  }, [learningModel]);

  const extractMerchant = (description) => {
    // Extract merchant name from transaction description
    const words = description.toLowerCase().split(/[\s\-#\*]+/);
    return words.slice(0, 2).join(' ').trim();
  };

  const findMatchingRefunds = useCallback((transactions) => {
    const matches = new Map();
    const refundMatches = [];

    transactions.forEach((transaction, index) => {
      if (transaction.amount > 0) {
        // This is a charge, look for matching refunds
        const merchant = extractMerchant(transaction.description);
        const amount = transaction.amount;
        const dateWindow = 90; // Look for refunds within 90 days
        
        // Find potential refunds (negative amounts) for this merchant and amount
        const potentialRefunds = transactions.filter((t, i) => {
          if (i === index || t.amount >= 0) return false; // Skip same transaction and non-refunds
          
          const refundMerchant = extractMerchant(t.description);
          const daysDiff = Math.abs(transaction.date - t.date) / (1000 * 60 * 60 * 24);
          
          return (
            Math.abs(t.amount) === amount && // Same amount (refund is negative)
            daysDiff <= dateWindow && // Within date window
            (refundMerchant === merchant || // Same merchant
             transaction.description.toLowerCase().includes('refund') ||
             t.description.toLowerCase().includes('refund'))
          );
        });

        if (potentialRefunds.length > 0) {
          // Take the closest refund by date
          const closestRefund = potentialRefunds.reduce((closest, current) => {
            const currentDiff = Math.abs(transaction.date - current.date);
            const closestDiff = Math.abs(transaction.date - closest.date);
            return currentDiff < closestDiff ? current : closest;
          });

          refundMatches.push({
            charge: transaction,
            refund: closestRefund,
            merchant: merchant,
            amount: amount,
            daysBetween: Math.abs(transaction.date - closestRefund.date) / (1000 * 60 * 60 * 24)
          });

          matches.set(transaction.id, closestRefund.id);
          matches.set(closestRefund.id, transaction.id);
        }
      }
    });

    return { matches, refundMatches };
  }, []);

  const getNetTransactions = useCallback((transactions) => {
    if (!showRefundMatching) return transactions;

    const { matches } = findMatchingRefunds(transactions);
    
    // Filter out transactions that have matching refunds (net zero spending)
    return transactions.filter(t => {
      // Keep all transactions that don't have matches
      if (!matches.has(t.id)) return true;
      
      // For matched pairs, keep only the charge (positive amount) but mark it as refunded
      if (t.amount > 0) {
        t.isRefunded = true;
        t.netAmount = 0; // This charge was refunded, so net spending is 0
        return true;
      }
      
      // Hide the refund transaction (negative amount) since we're showing net
      return false;
    });
  }, [findMatchingRefunds, showRefundMatching]);

  const updateLearningModel = useCallback((description, category) => {
    const merchant = extractMerchant(description);
    setLearningModel(prev => new Map(prev).set(merchant, category));
  }, []);

  // Extract user name from file path (e.g., "Statements/Ashish/..." -> "Ashish")
  const extractUserFromFile = (file) => {
    if (file.webkitRelativePath) {
      const parts = file.webkitRelativePath.split('/');
      if (parts.length > 1) {
        return parts[1]; // Return the user folder name
      }
    }
    return 'Unknown User';
  };

  // Parse different statement formats
  const parseStatement = useCallback((file, content) => {
    return new Promise((resolve) => {
      Papa.parse(content, {
        header: true,
        dynamicTyping: true,
        skipEmptyLines: true,
        complete: (results) => {
          const userName = extractUserFromFile(file);
          const transactions = results.data.map((row, index) => {
            const date = row.Date || row.date || row['Transaction Date'] || row['Posted Date'] || '';
            const description = row.Description || row.description || row['Transaction Description'] || row.Memo || '';
            const amount = parseFloat(row.Amount || row.amount || row.Debit || row.Credit || 0);
            const category = row.Category || row.category || categorizeTransaction(description, amount);

            return {
              id: `${file.name}-${index}`,
              date: new Date(date),
              description: description.trim(),
              amount: amount,
              category: category,
              source: file.name,
              user: userName,
              isExpense: amount > 0, // For credit cards, positive amounts are spending/charges
              isCredit: amount < 0,   // Negative amounts are credits/refunds
              isImmutableCategory: amount < 0 // Mark credits as having immutable categories
            };
          }).filter(t => t.date && !isNaN(t.date.getTime()) && t.amount !== 0);

          resolve(transactions);
        }
      });
    });
  }, [categorizeTransaction]);

  const handleFileUpload = useCallback(async (files) => {
    setIsProcessing(true);
    const newTransactions = [];

    for (const file of files) {
      try {
        const content = await new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = (e) => resolve(e.target.result);
          reader.onerror = reject;
          reader.readAsText(file);
        });

        const transactions = await parseStatement(file, content);
        newTransactions.push(...transactions);
      } catch (error) {
        console.error(`Error processing ${file.name}:`, error);
      }
    }

    const allTrans = [...allTransactions, ...newTransactions].sort((a, b) => a.date - b.date);
    setAllTransactions(allTrans);
    setStatements(prev => [...prev, ...newTransactions]);

    // Extract unique users from all transactions
    const users = [...new Set(allTrans.map(t => t.user))].sort();
    setAvailableUsers(users);

    processData(allTrans);
    setIsProcessing(false);
  }, [allTransactions, parseStatement]);

  const processData = useCallback((transactions) => {
    // Filter transactions by selected user
    const userFilteredTransactions = selectedUser === 'combined'
      ? transactions
      : transactions.filter(t => t.user === selectedUser);

    const monthlyMap = new Map();
    const categoryMap = new Map();

    // Apply refund matching if enabled
    const netTransactions = getNetTransactions(userFilteredTransactions);

    netTransactions.forEach(transaction => {
      const monthYear = `${transaction.date.getFullYear()}-${String(transaction.date.getMonth() + 1).padStart(2, '0')}`;
      
      if (!monthlyMap.has(monthYear)) {
        monthlyMap.set(monthYear, { expenses: 0, credits: 0, month: monthYear });
      }

      const monthData = monthlyMap.get(monthYear);
      
      // For credit card statements: positive amounts are charges/spending, negative amounts are credits
      if (transaction.amount > 0) {
        // Use netAmount if available (for refunded transactions), otherwise use full amount
        const effectiveAmount = transaction.isRefunded ? (transaction.netAmount || 0) : transaction.amount;
        monthData.expenses += effectiveAmount;
      } else {
        monthData.credits += Math.abs(transaction.amount);
      }

      // Category data - only track actual net spending (positive amounts that aren't fully refunded)
      if (transaction.amount > 0) {
        const category = transaction.category;
        if (!categoryMap.has(category)) {
          categoryMap.set(category, { total: 0, count: 0, transactions: [] });
        }
        
        const catData = categoryMap.get(category);
        const effectiveAmount = transaction.isRefunded ? (transaction.netAmount || 0) : transaction.amount;
        catData.total += effectiveAmount;
        if (effectiveAmount > 0) catData.count += 1; // Only count as a transaction if there's net spending
        catData.transactions.push(transaction);
      }
    });

    const monthlyArray = Array.from(monthlyMap.values())
      .map(month => ({
        ...month,
        netSpending: month.expenses - month.credits, // Net spending after credits applied
        date: new Date(month.month + '-01').toLocaleDateString('en-US', { year: 'numeric', month: 'short' })
      }))
      .sort((a, b) => new Date(a.month) - new Date(b.month));

    const categoryArray = Array.from(categoryMap.entries())
      .map(([name, data]) => ({ 
        name, 
        value: data.total, 
        count: data.count,
        avgTransaction: data.count > 0 ? data.total / data.count : 0
      }))
      .sort((a, b) => b.value - a.value);

    setMonthlyData(monthlyArray);
    setCategoryData(categoryArray);

    // Calculate summary
    const totalExpenses = monthlyArray.reduce((sum, month) => sum + month.expenses, 0);
    const totalCredits = monthlyArray.reduce((sum, month) => sum + month.credits, 0);
    const netSpending = totalExpenses - totalCredits;
    const avgMonthlySpending = monthlyArray.length > 0 ? totalExpenses / monthlyArray.length : 0;

    setSummary({
      totalIncome: 0, // No income in credit card statements
      totalExpenses,
      totalSavings: -netSpending, // Negative net spending means you got more credits than charges
      avgMonthlySpending
    });
  }, [getNetTransactions, selectedUser]);

  const updateTransactionCategory = (transactionId, newCategory) => {
    const updatedTransactions = allTransactions.map(t => {
      if (t.id === transactionId) {
        // Prevent changing category for credits/refunds (immutable)
        if (t.isImmutableCategory) {
          return t; // Don't change the category for credits/refunds
        }
        
        updateLearningModel(t.description, newCategory);
        return { ...t, category: newCategory };
      }
      return t;
    });
    
    setAllTransactions(updatedTransactions);
    processData(updatedTransactions);
    setEditingTransaction(null);
  };

  const getFilteredTransactions = () => {
    // First filter by selected user
    let filtered = selectedUser === 'combined'
      ? allTransactions
      : allTransactions.filter(t => t.user === selectedUser);

    // Show both charges and credits when not filtering by category, or when specifically filtering for Credits/Refunds
    filtered = categoryFilter === 'Credits/Refunds'
      ? filtered.filter(t => t.isCredit)
      : categoryFilter === 'all'
        ? filtered
        : filtered.filter(t => t.isExpense); // Only charges for spending categories

    if (categoryFilter !== 'all' && categoryFilter !== 'Credits/Refunds') {
      filtered = filtered.filter(t => t.category === categoryFilter);
    }
    
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(t => 
        t.description.toLowerCase().includes(query) ||
        t.category.toLowerCase().includes(query) ||
        t.amount.toString().includes(query) ||
        t.date.toLocaleDateString().includes(query)
      );
    }
    
    if (dateFilter.start) {
      filtered = filtered.filter(t => t.date >= new Date(dateFilter.start));
    }
    
    if (dateFilter.end) {
      filtered = filtered.filter(t => t.date <= new Date(dateFilter.end));
    }
    
    return filtered.sort((a, b) => b.date - a.date);
  };

  const getMultiCategoryData = () => {
    if (selectedCategories.size === 0) return categoryData;
    
    return categoryData.filter(cat => selectedCategories.has(cat.name));
  };

  const getMonthlyCategoryTotals = () => {
    const filtered = getFilteredTransactions();
    const netFiltered = getNetTransactions(filtered);
    const monthlyTotals = new Map();

    netFiltered.forEach(transaction => {
      const monthYear = `${transaction.date.getFullYear()}-${String(transaction.date.getMonth() + 1).padStart(2, '0')}`;
      const monthKey = new Date(monthYear + '-01').toLocaleDateString('en-US', { year: 'numeric', month: 'short' });
      
      if (!monthlyTotals.has(monthKey)) {
        monthlyTotals.set(monthKey, new Map());
      }
      
      const monthData = monthlyTotals.get(monthKey);
      const currentTotal = monthData.get(transaction.category) || 0;
      const effectiveAmount = transaction.isRefunded ? (transaction.netAmount || 0) : transaction.amount;
      monthData.set(transaction.category, currentTotal + effectiveAmount);
    });

    // Convert to sorted array format and filter out zero amounts
    return Array.from(monthlyTotals.entries())
      .map(([month, categories]) => ({
        month,
        categories: Array.from(categories.entries())
          .map(([category, total]) => ({ category, total }))
          .filter(cat => cat.total > 0) // Only show categories with net spending > 0
          .sort((a, b) => b.total - a.total),
        monthTotal: Array.from(categories.values()).reduce((sum, val) => sum + val, 0)
      }))
      .filter(monthData => monthData.monthTotal > 0) // Only show months with net spending
      .sort((a, b) => new Date(a.month + ' 1, 2000') - new Date(b.month + ' 1, 2000'));
  };

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    const files = Array.from(e.dataTransfer.files).filter(file => 
      file.type === 'text/csv' || file.name.endsWith('.csv')
    );
    if (files.length > 0) {
      handleFileUpload(files);
    }
  }, [handleFileUpload]);

  const handleFileInput = useCallback((e) => {
    const files = Array.from(e.target.files);
    handleFileUpload(files);
    e.target.value = '';
  }, [handleFileUpload]);

  const clearData = () => {
    setStatements([]);
    setAllTransactions([]);
    setMonthlyData([]);
    setCategoryData([]);
    setSearchQuery('');
    setCategoryFilter('all');
    setDateFilter({ start: '', end: '' });
    // Note: We keep both learning model and custom categories across data clears
    setSummary({ totalIncome: 0, totalExpenses: 0, totalSavings: 0, avgMonthlySpending: 0 });
  };

  const clearLearningModel = () => {
    setLearningModel(new Map());
    localStorage.removeItem('financialTrackerLearningModel');
  };

  const exportLearningModel = () => {
    const modelObject = Object.fromEntries(learningModel);
    const exportData = {
      version: "1.0",
      exportDate: new Date().toISOString(),
      totalPatterns: learningModel.size,
      learningModel: modelObject,
      customCategories: customCategories
    };
    
    const dataStr = JSON.stringify(exportData, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    
    const link = document.createElement('a');
    link.href = URL.createObjectURL(dataBlob);
    link.download = `financial-tracker-ai-model-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const importLearningModel = (event) => {
    const file = event.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const importData = JSON.parse(e.target.result);
        
        // Validate the file structure
        if (!importData.learningModel || !importData.version) {
          alert('Invalid AI model file format');
          return;
        }
        
        // Import learning model
        const importedModel = new Map(Object.entries(importData.learningModel));
        setLearningModel(importedModel);
        
        // Import custom categories if they exist
        if (importData.customCategories && Array.isArray(importData.customCategories)) {
          setCustomCategories(importData.customCategories);
        }
        
        // Show success message
        alert(`Successfully imported ${importData.totalPatterns} merchant patterns and ${importData.customCategories?.length || 0} custom categories!`);
        
      } catch (error) {
        console.error('Error importing AI model:', error);
        alert('Error importing AI model file. Please check the file format.');
      }
    };
    
    reader.readAsText(file);
    // Reset the input
    event.target.value = '';
  };

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(value);
  };

  const uniqueCategories = [...new Set(allTransactions.map(t => t.category))].sort();

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="max-w-7xl mx-auto">
        <header className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-800 mb-2">Advanced Financial Tracker</h1>
          <p className="text-gray-600">AI-powered categorization with learning capabilities</p>
        </header>

        {/* Upload Section */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
          <div 
            className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-blue-400 transition-colors"
            onDrop={handleDrop}
            onDragOver={(e) => e.preventDefault()}
            onDragEnter={(e) => e.preventDefault()}
          >
            <Upload className="mx-auto h-12 w-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-700 mb-2">Upload Statements Folder</h3>
            <p className="text-gray-500 mb-4">Select your Statements folder to automatically organize by user. AI learns from your categorization choices.</p>
            <input
              type="file"
              multiple
              accept=".csv"
              onChange={handleFileInput}
              className="hidden"
              id="file-upload"
              webkitdirectory=""
              directory=""
            />
            <label
              htmlFor="file-upload"
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md cursor-pointer hover:bg-blue-700 transition-colors"
            >
              <FileText className="mr-2 h-4 w-4" />
              Choose Folder
            </label>
            {allTransactions.length > 0 && (
              <button
                onClick={clearData}
                className="ml-4 inline-flex items-center px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
              >
                <X className="mr-2 h-4 w-4" />
                Clear All Data
              </button>
            )}
          </div>
          
          {isProcessing && (
            <div className="mt-4 text-center">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <p className="mt-2 text-gray-600">Processing statements...</p>
            </div>
          )}

          {/* User Selection */}
          {availableUsers.length > 0 && (
            <div className="mt-4 p-4 bg-blue-50 rounded-lg">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <label className="text-sm font-medium text-blue-900">View Data For:</label>
                  <select
                    value={selectedUser}
                    onChange={(e) => setSelectedUser(e.target.value)}
                    className="px-4 py-2 border border-blue-300 rounded-lg bg-white text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="combined">All Users Combined</option>
                    {availableUsers.map(user => (
                      <option key={user} value={user}>{user}</option>
                    ))}
                  </select>
                </div>
                <div className="text-sm text-blue-700">
                  {selectedUser === 'combined'
                    ? `Showing data for all ${availableUsers.length} user(s)`
                    : `Showing data for ${selectedUser}`
                  }
                </div>
              </div>
            </div>
          )}

          {learningModel.size > 0 && (
            <div className="mt-4 p-4 bg-green-50 rounded-lg">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <Brain className="h-5 w-5 text-green-600 mr-2" />
                  <span className="text-green-800 font-medium">
                    AI Model has learned {learningModel.size} merchant patterns (saved automatically)
                  </span>
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={exportLearningModel}
                    className="flex items-center px-3 py-1 text-sm text-blue-600 hover:text-blue-800 border border-blue-300 rounded hover:bg-blue-50"
                    title="Export AI learning data to file"
                  >
                    <Download className="h-3 w-3 mr-1" />
                    Export
                  </button>
                  <input
                    type="file"
                    accept=".json"
                    onChange={importLearningModel}
                    className="hidden"
                    id="import-model"
                  />
                  <label
                    htmlFor="import-model"
                    className="flex items-center px-3 py-1 text-sm text-green-600 hover:text-green-800 border border-green-300 rounded hover:bg-green-50 cursor-pointer"
                    title="Import AI learning data from file"
                  >
                    <FolderOpen className="h-3 w-3 mr-1" />
                    Import
                  </label>
                  <button
                    onClick={clearLearningModel}
                    className="text-sm text-red-600 hover:text-red-800 underline"
                  >
                    Reset AI
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Navigation Tabs */}
        {allTransactions.length > 0 && (
          <div className="bg-white rounded-lg shadow-lg mb-8">
            <div className="border-b border-gray-200">
              <nav className="flex space-x-8 px-6">
                {['overview', 'transactions', 'categories', 'manage-categories', 'insights'].map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`py-4 px-2 border-b-2 font-medium text-sm capitalize ${
                      activeTab === tab
                        ? 'border-blue-500 text-blue-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    {tab.replace('-', ' ')}
                  </button>
                ))}
              </nav>
            </div>

            {/* Tab Content */}
            <div className="p-6">
              {activeTab === 'overview' && (
                <>
                  {/* Summary Cards */}
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                    <div className="bg-gradient-to-br from-red-50 to-red-100 rounded-lg p-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-red-600">Total Charges</p>
                          <p className="text-2xl font-bold text-red-700">{formatCurrency(summary.totalExpenses)}</p>
                        </div>
                        <TrendingUp className="h-8 w-8 text-red-600" />
                      </div>
                    </div>
                    
                    <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-green-600">Total Credits</p>
                          <p className="text-2xl font-bold text-green-700">{formatCurrency(monthlyData.reduce((sum, month) => sum + month.credits, 0))}</p>
                        </div>
                        <TrendingDown className="h-8 w-8 text-green-600" />
                      </div>
                    </div>
                    
                    <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg p-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-purple-600">Net Spending</p>
                          <p className={`text-2xl font-bold ${(summary.totalExpenses - monthlyData.reduce((sum, month) => sum + month.credits, 0)) >= 0 ? 'text-red-700' : 'text-green-700'}`}>
                            {formatCurrency(summary.totalExpenses - monthlyData.reduce((sum, month) => sum + month.credits, 0))}
                          </p>
                        </div>
                        <DollarSign className="h-8 w-8 text-purple-600" />
                      </div>
                    </div>
                    
                    <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-lg p-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-orange-600">Avg Monthly Charges</p>
                          <p className="text-2xl font-bold text-orange-700">{formatCurrency(summary.avgMonthlySpending)}</p>
                        </div>
                        <Calendar className="h-8 w-8 text-orange-600" />
                      </div>
                    </div>
                  </div>

                  {/* Charts */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
                    <div className="bg-white rounded-lg shadow-lg p-6">
                      <h3 className="text-xl font-bold text-gray-800 mb-4">Monthly Spending & Payments</h3>
                      <ResponsiveContainer width="100%" height={300}>
                        <LineChart data={monthlyData}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="date" />
                          <YAxis tickFormatter={(value) => `${(value/1000).toFixed(0)}k`} />
                          <Tooltip formatter={(value) => formatCurrency(value)} />
                          <Legend />
                          <Line type="monotone" dataKey="payments" stroke="#10b981" strokeWidth={3} name="Payments" />
                          <Line type="monotone" dataKey="expenses" stroke="#ef4444" strokeWidth={3} name="Spending" />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>

                    <div className="bg-white rounded-lg shadow-lg p-6">
                      <h3 className="text-xl font-bold text-gray-800 mb-4">Spending by Category</h3>
                      <ResponsiveContainer width="100%" height={300}>
                        <PieChart>
                          <Pie
                            data={categoryData.slice(0, 8)}
                            cx="50%"
                            cy="50%"
                            labelLine={false}
                            label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                            outerRadius={80}
                            fill="#8884d8"
                            dataKey="value"
                          >
                            {categoryData.slice(0, 8).map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip formatter={(value) => formatCurrency(value)} />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </>
              )}

              {activeTab === 'transactions' && (
                <div>
                  <div className="flex flex-wrap gap-4 mb-6">
                    <div className="flex items-center space-x-2">
                      <Search className="h-4 w-4 text-gray-400" />
                      <input
                        type="text"
                        placeholder="Search transactions, descriptions, categories..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="px-4 py-2 border rounded-lg w-80"
                      />
                    </div>
                    
                    <select
                      value={categoryFilter}
                      onChange={(e) => setCategoryFilter(e.target.value)}
                      className="px-4 py-2 border rounded-lg"
                    >
                      <option value="all">All Categories</option>
                      {uniqueCategories.map(cat => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                    </select>
                    
                    <input
                      type="date"
                      value={dateFilter.start}
                      onChange={(e) => setDateFilter(prev => ({...prev, start: e.target.value}))}
                      className="px-4 py-2 border rounded-lg"
                      placeholder="Start date"
                    />
                    
                    <input
                      type="date"
                      value={dateFilter.end}
                      onChange={(e) => setDateFilter(prev => ({...prev, end: e.target.value}))}
                      className="px-4 py-2 border rounded-lg"
                      placeholder="End date"
                    />

                    <button
                      onClick={() => setShowRefundMatching(!showRefundMatching)}
                      className={`flex items-center px-4 py-2 rounded-lg border ${
                        showRefundMatching 
                          ? 'bg-green-50 border-green-300 text-green-700' 
                          : 'bg-gray-50 border-gray-300 text-gray-700'
                      }`}
                      title="Match charges with refunds to show net spending"
                    >
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Match Refunds
                    </button>

                    <button
                      onClick={() => setShowMonthlySummary(!showMonthlySummary)}
                      className={`flex items-center px-4 py-2 rounded-lg border ${
                        showMonthlySummary 
                          ? 'bg-blue-50 border-blue-300 text-blue-700' 
                          : 'bg-gray-50 border-gray-300 text-gray-700'
                      }`}
                    >
                      <BarChart3 className="h-4 w-4 mr-2" />
                      Monthly Summary
                    </button>

                    {(searchQuery || categoryFilter !== 'all' || dateFilter.start || dateFilter.end) && (
                      <button
                        onClick={() => {
                          setSearchQuery('');
                          setCategoryFilter('all');
                          setDateFilter({ start: '', end: '' });
                        }}
                        className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
                      >
                        Clear Filters
                      </button>
                    )}
                  </div>

                  <div className="mb-4 flex items-center justify-between">
                    <span className="text-sm text-gray-600">
                      Showing {getFilteredTransactions().length} of {allTransactions.length} transactions
                      {categoryFilter === 'Credits/Refunds' && (
                        <span className="ml-2 text-green-600 font-medium">
                          (Credits & Refunds only)
                        </span>
                      )}
                    </span>
                    {showRefundMatching && (
                      <span className="text-sm text-green-600 font-medium">
                        ✓ Refund matching enabled - showing net spending
                      </span>
                    )}
                  </div>

                  {/* Monthly Category Summary */}
                  {showMonthlySummary && getMonthlyCategoryTotals().length > 0 && (
                    <div className="bg-white rounded-lg shadow mb-8 overflow-hidden">
                      <div className="bg-gray-50 px-6 py-4 border-b">
                        <h3 className="text-lg font-semibold text-gray-800">Monthly Spending by Category</h3>
                      </div>
                      <div className="overflow-x-auto">
                        <div className="px-6 py-4">
                          <div className="grid gap-6">
                            {getMonthlyCategoryTotals().map((monthData) => (
                              <div key={monthData.month} className="border rounded-lg p-4">
                                <div className="flex items-center justify-between mb-3">
                                  <h4 className="font-semibold text-gray-800">{monthData.month}</h4>
                                  <span className="text-lg font-bold text-blue-600">
                                    {formatCurrency(monthData.monthTotal)}
                                  </span>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                  {monthData.categories.map((cat) => (
                                    <div key={cat.category} className="flex items-center justify-between bg-gray-50 rounded px-3 py-2">
                                      <span className="text-sm text-gray-700 truncate mr-2">{cat.category}</span>
                                      <span className="text-sm font-semibold text-gray-900">
                                        {formatCurrency(cat.total)}
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="bg-white rounded-lg overflow-hidden shadow">
                    <table className="w-full">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Description</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Category</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Amount</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {getFilteredTransactions().slice(0, 100).map((transaction) => {
                          const netTransaction = showRefundMatching ? getNetTransactions([transaction])[0] : transaction;
                          const isRefunded = netTransaction?.isRefunded;
                          
                          return (
                            <tr key={transaction.id} className={`hover:bg-gray-50 ${isRefunded ? 'bg-yellow-50' : ''}`}>
                              <td className="px-6 py-4 text-sm text-gray-900">
                                {transaction.date.toLocaleDateString()}
                              </td>
                              <td className="px-6 py-4 text-sm text-gray-900 max-w-xs truncate" title={transaction.description}>
                                {transaction.description}
                                {isRefunded && (
                                  <span className="ml-2 text-xs bg-yellow-200 text-yellow-800 px-2 py-1 rounded">
                                    REFUNDED
                                  </span>
                                )}
                              </td>
                              <td className="px-6 py-4 text-sm">
                                {editingTransaction === transaction.id ? (
                                  transaction.isImmutableCategory ? (
                                    <span className="px-2 py-1 rounded text-xs font-medium bg-gray-100 text-gray-600">
                                      Credits/Refunds (Locked)
                                    </span>
                                  ) : (
                                    <select
                                      value={transaction.category}
                                      onChange={(e) => updateTransactionCategory(transaction.id, e.target.value)}
                                      className="px-2 py-1 border rounded text-sm"
                                      autoFocus
                                    >
                                      {getAllCategories().map(cat => (
                                        <option key={cat} value={cat}>{cat}</option>
                                      ))}
                                    </select>
                                  )
                                ) : (
                                  <span className={`px-2 py-1 rounded text-xs font-medium ${
                                    transaction.category === 'Credits/Refunds' ? 'bg-green-100 text-green-800' :
                                    transaction.category === 'Other' ? 'bg-gray-100 text-gray-800' : 
                                    learningModel.has(extractMerchant(transaction.description.toLowerCase())) ? 'bg-green-100 text-green-800' :
                                    'bg-blue-100 text-blue-800'
                                  }`}>
                                    {transaction.category}
                                    {transaction.isImmutableCategory && (
                                      <span className="ml-1 text-xs">🔒</span>
                                    )}
                                    {!transaction.isImmutableCategory && learningModel.has(extractMerchant(transaction.description.toLowerCase())) && (
                                      <Brain className="inline h-3 w-3 ml-1" title="AI Learned" />
                                    )}
                                  </span>
                                )}
                              </td>
                              <td className="px-6 py-4 text-sm font-medium">
                                <div className="flex flex-col">
                                  <span className={`${
                                    isRefunded ? 'line-through text-gray-400' : 
                                    transaction.isCredit ? 'text-green-600' : 'text-red-600'
                                  }`}>
                                    {transaction.isCredit ? '+' : ''}{formatCurrency(Math.abs(transaction.amount))}
                                  </span>
                                  {isRefunded && (
                                    <span className="text-green-600 text-xs">
                                      Net: {formatCurrency(netTransaction.netAmount || 0)}
                                    </span>
                                  )}
                                </div>
                              </td>
                              <td className="px-6 py-4 text-sm">
                                {transaction.isImmutableCategory ? (
                                  <span className="text-gray-400 text-xs">Locked</span>
                                ) : (
                                  <button
                                    onClick={() => setEditingTransaction(
                                      editingTransaction === transaction.id ? null : transaction.id
                                    )}
                                    className="text-blue-600 hover:text-blue-800"
                                    title="Edit category"
                                  >
                                    <Edit2 className="h-4 w-4" />
                                  </button>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                    
                    {getFilteredTransactions().length > 100 && (
                      <div className="px-6 py-4 bg-gray-50 text-sm text-gray-600 text-center">
                        Showing first 100 results. Use filters to narrow down your search.
                      </div>
                    )}
                  </div>
                </div>
              )}

              {activeTab === 'manage-categories' && (
                <div>
                  <div className="mb-6">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-semibold">Manage Categories</h3>
                      <button
                        onClick={() => setShowAddCategory(!showAddCategory)}
                        className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Add Category
                      </button>
                    </div>

                    {showAddCategory && (
                      <div className="bg-gray-50 rounded-lg p-4 mb-6">
                        <h4 className="font-medium mb-3">Create New Category</h4>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Parent Category (Optional)
                            </label>
                            <select
                              value={newCategoryParent}
                              onChange={(e) => setNewCategoryParent(e.target.value)}
                              className="w-full px-3 py-2 border rounded-lg"
                            >
                              <option value="">No Parent (Main Category)</option>
                              {BASE_CATEGORIES.map(cat => (
                                <option key={cat} value={cat}>{cat}</option>
                              ))}
                            </select>
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Category Name
                            </label>
                            <input
                              type="text"
                              value={newCategoryName}
                              onChange={(e) => setNewCategoryName(e.target.value)}
                              placeholder="e.g., Coffee Shops, Auto Maintenance"
                              className="w-full px-3 py-2 border rounded-lg"
                              onKeyPress={(e) => e.key === 'Enter' && addCustomCategory()}
                            />
                          </div>
                          <div className="flex items-end space-x-2">
                            <button
                              onClick={addCustomCategory}
                              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                            >
                              Add
                            </button>
                            <button
                              onClick={() => {
                                setShowAddCategory(false);
                                setNewCategoryName('');
                                setNewCategoryParent('');
                              }}
                              className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                        {newCategoryParent && newCategoryName && (
                          <div className="mt-3 text-sm text-gray-600">
                            Preview: <span className="font-medium">{newCategoryParent} - {newCategoryName}</span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="bg-white rounded-lg shadow p-6">
                      <h4 className="font-semibold mb-4">Predefined Categories</h4>
                      <div className="space-y-2 max-h-96 overflow-y-auto">
                        {PREDEFINED_CATEGORIES.map(category => (
                          <div key={category} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                            <span className="text-sm">{category}</span>
                            <span className="text-xs text-gray-500">Built-in</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="bg-white rounded-lg shadow p-6">
                      <h4 className="font-semibold mb-4">Custom Categories ({customCategories.length})</h4>
                      {customCategories.length === 0 ? (
                        <p className="text-gray-500 text-sm">No custom categories yet. Create one above!</p>
                      ) : (
                        <div className="space-y-2 max-h-96 overflow-y-auto">
                          {customCategories.map(category => (
                            <div key={category} className="flex items-center justify-between p-2 bg-blue-50 rounded">
                              <span className="text-sm">{category}</span>
                              <button
                                onClick={() => removeCustomCategory(category)}
                                className="text-red-600 hover:text-red-800 p-1"
                                title="Delete category"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                    <div className="mt-6 p-4 bg-green-50 rounded-lg">
                      <div className="flex items-start">
                        <div className="text-green-600 mr-2">✅</div>
                        <div className="text-sm text-green-800">
                          <strong>Automatic Persistence:</strong> All custom categories are automatically saved and will persist across browser sessions. 
                          Deleting a custom category will reassign all transactions using that category to "Other".
                        </div>
                      </div>
                    </div>
                </div>
              )}

              {activeTab === 'categories' && (
                <div>
                  <div className="mb-6">
                    <h3 className="text-lg font-semibold mb-4">Select Categories to Compare</h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                      {uniqueCategories.filter(cat => cat !== 'Credits/Refunds').map(category => (
                        <label key={category} className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            checked={selectedCategories.has(category)}
                            onChange={(e) => {
                              const newSet = new Set(selectedCategories);
                              if (e.target.checked) {
                                newSet.add(category);
                              } else {
                                newSet.delete(category);
                              }
                              setSelectedCategories(newSet);
                            }}
                            className="rounded"
                          />
                          <span className="text-sm">{category}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    <div className="bg-white rounded-lg shadow-lg p-6">
                      <h3 className="text-xl font-bold text-gray-800 mb-4">Category Comparison</h3>
                      <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={getMultiCategoryData()}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} />
                          <YAxis tickFormatter={(value) => `$${(value/1000).toFixed(0)}k`} />
                          <Tooltip formatter={(value) => formatCurrency(value)} />
                          <Bar dataKey="value" fill="#8884d8" />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>

                    <div className="bg-white rounded-lg shadow-lg p-6">
                      <h3 className="text-xl font-bold text-gray-800 mb-4">Transaction Count vs Amount</h3>
                      <ResponsiveContainer width="100%" height={300}>
                        <ScatterChart data={getMultiCategoryData()}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="count" name="transactions" />
                          <YAxis dataKey="value" name="amount" tickFormatter={(value) => `$${(value/1000).toFixed(0)}k`} />
                          <Tooltip 
                            formatter={(value, name) => [
                              name === 'value' ? formatCurrency(value) : value,
                              name === 'value' ? 'Total Amount' : 'Transaction Count'
                            ]}
                            labelFormatter={(label) => `Category: ${getMultiCategoryData()[label]?.name || ''}`}
                          />
                          <Scatter dataKey="value" fill="#8884d8" />
                        </ScatterChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  <div className="mt-8 bg-white rounded-lg shadow-lg p-6">
                    <h3 className="text-xl font-bold text-gray-800 mb-4">Category Details</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {getMultiCategoryData().map((category, index) => (
                        <div key={category.name} className="border rounded-lg p-4">
                          <div className="flex items-center mb-2">
                            <div 
                              className="w-4 h-4 rounded mr-2" 
                              style={{ backgroundColor: COLORS[index % COLORS.length] }}
                            ></div>
                            <h4 className="font-semibold">{category.name}</h4>
                          </div>
                          <p className="text-2xl font-bold text-gray-800">{formatCurrency(category.value)}</p>
                          <p className="text-sm text-gray-600">{category.count} transactions</p>
                          <p className="text-sm text-gray-600">Avg: {formatCurrency(category.avgTransaction)}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'insights' && (
                <div className="space-y-8">
                  <div className="bg-white rounded-lg shadow-lg p-6">
                    <h3 className="text-xl font-bold text-gray-800 mb-4">Spending Insights</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="bg-blue-50 rounded-lg p-4">
                        <h4 className="font-semibold text-blue-800 mb-2">Top Spending Category</h4>
                        <p className="text-2xl font-bold text-blue-900">
                          {categoryData[0]?.name || 'N/A'}
                        </p>
                        <p className="text-blue-700">
                          {categoryData[0] ? formatCurrency(categoryData[0].value) : '$0'}
                        </p>
                      </div>
                      
                      <div className="bg-green-50 rounded-lg p-4">
                        <h4 className="font-semibold text-green-800 mb-2">Best Savings Month</h4>
                        <p className="text-2xl font-bold text-green-900">
                          {monthlyData.reduce((best, current) => 
                            current.savings > (best?.savings || -Infinity) ? current : best, null
                          )?.date || 'N/A'}
                        </p>
                        <p className="text-green-700">
                          {monthlyData.length > 0 ? formatCurrency(Math.max(...monthlyData.map(m => m.savings))) : '$0'}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-white rounded-lg shadow-lg p-6">
                    <h3 className="text-xl font-bold text-gray-800 mb-4">AI Learning Progress</h3>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <span>Merchants Learned</span>
                        <span className="font-bold">{learningModel.size}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span>Total Transactions</span>
                        <span className="font-bold">{allTransactions.length}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span>Auto-categorization Rate</span>
                        <span className="font-bold">
                          {allTransactions.length > 0 ? 
                            Math.round((allTransactions.filter(t => learningModel.has(extractMerchant(t.description.toLowerCase()))).length / allTransactions.length) * 100) : 0}%
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span>Model Persistence</span>
                        <span className="font-bold text-green-600">✓ Saved Automatically</span>
                      </div>
                    </div>
                    
                    <div className="mt-6 flex justify-center space-x-4">
                      <button
                        onClick={exportLearningModel}
                        className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                        disabled={learningModel.size === 0}
                      >
                        <Download className="h-4 w-4 mr-2" />
                        Export AI Model
                      </button>
                      <input
                        type="file"
                        accept=".json"
                        onChange={importLearningModel}
                        className="hidden"
                        id="import-model-insights"
                      />
                      <label
                        htmlFor="import-model-insights"
                        className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 cursor-pointer"
                      >
                        <FolderOpen className="h-4 w-4 mr-2" />
                        Import AI Model
                      </label>
                    </div>
                    
                    {learningModel.size > 0 && (
                      <div className="mt-6">
                        <h4 className="font-semibold mb-3">Learned Patterns:</h4>
                        <div className="max-h-40 overflow-y-auto space-y-1">
                          {Array.from(learningModel.entries()).slice(0, 10).map(([merchant, category]) => (
                            <div key={merchant} className="text-sm bg-gray-50 rounded px-3 py-2 flex justify-between">
                              <span className="text-gray-700">"{merchant}"</span>
                              <span className="text-blue-600 font-medium">{category}</span>
                            </div>
                          ))}
                          {learningModel.size > 10 && (
                            <div className="text-sm text-gray-500 text-center py-2">
                              ... and {learningModel.size - 10} more patterns
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {allTransactions.length > 0 && (
          <div className="mt-8 text-center text-gray-600">
            <p>
              Processed {allTransactions.length} transactions from {new Set(statements.map(s => s.source)).size} statement(s)
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default FinancialTracker;