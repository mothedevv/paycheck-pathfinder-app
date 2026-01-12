// Local storage utility for managing app data
const STORAGE_KEY = 'payday_planner_data';

const getStore = () => {
  const data = localStorage.getItem(STORAGE_KEY);
  if (!data) {
    return {
      userBudget: [],
      bills: [],
      debts: [],
      savingsGoals: [],
      incomes: [],
      assets: [],
      oneTimeDeposits: [],
      paydayHistory: []
    };
  }
  return JSON.parse(data);
};

const saveStore = (store) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
};

const generateId = () => {
  return `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

const getCurrentDate = () => {
  return new Date().toISOString();
};

export const localDB = {
  entities: {
    UserBudget: {
      filter: async () => {
        const store = getStore();
        return store.userBudget;
      },
      create: async (data) => {
        const store = getStore();
        const record = {
          ...data,
          id: generateId(),
          created_date: getCurrentDate(),
          updated_date: getCurrentDate()
        };
        store.userBudget.push(record);
        saveStore(store);
        return record;
      },
      update: async (id, data) => {
        const store = getStore();
        const index = store.userBudget.findIndex(item => item.id === id);
        if (index !== -1) {
          store.userBudget[index] = {
            ...store.userBudget[index],
            ...data,
            updated_date: getCurrentDate()
          };
          saveStore(store);
          return store.userBudget[index];
        }
        throw new Error('Record not found');
      },
      delete: async (id) => {
        const store = getStore();
        store.userBudget = store.userBudget.filter(item => item.id !== id);
        saveStore(store);
      }
    },
    Bill: {
      filter: async () => {
        const store = getStore();
        return store.bills;
      },
      create: async (data) => {
        const store = getStore();
        const record = {
          ...data,
          id: generateId(),
          created_date: getCurrentDate(),
          updated_date: getCurrentDate()
        };
        store.bills.push(record);
        saveStore(store);
        return record;
      },
      bulkCreate: async (dataArray) => {
        const store = getStore();
        const records = dataArray.map(data => ({
          ...data,
          id: generateId(),
          created_date: getCurrentDate(),
          updated_date: getCurrentDate()
        }));
        store.bills.push(...records);
        saveStore(store);
        return records;
      },
      update: async (id, data) => {
        const store = getStore();
        const index = store.bills.findIndex(item => item.id === id);
        if (index !== -1) {
          store.bills[index] = {
            ...store.bills[index],
            ...data,
            updated_date: getCurrentDate()
          };
          saveStore(store);
          return store.bills[index];
        }
        throw new Error('Record not found');
      },
      delete: async (id) => {
        const store = getStore();
        store.bills = store.bills.filter(item => item.id !== id);
        saveStore(store);
      }
    },
    Debt: {
      filter: async () => {
        const store = getStore();
        return store.debts;
      },
      create: async (data) => {
        const store = getStore();
        const record = {
          ...data,
          id: generateId(),
          created_date: getCurrentDate(),
          updated_date: getCurrentDate()
        };
        store.debts.push(record);
        saveStore(store);
        return record;
      },
      update: async (id, data) => {
        const store = getStore();
        const index = store.debts.findIndex(item => item.id === id);
        if (index !== -1) {
          store.debts[index] = {
            ...store.debts[index],
            ...data,
            updated_date: getCurrentDate()
          };
          saveStore(store);
          return store.debts[index];
        }
        throw new Error('Record not found');
      },
      delete: async (id) => {
        const store = getStore();
        store.debts = store.debts.filter(item => item.id !== id);
        saveStore(store);
      }
    },
    SavingsGoal: {
      filter: async () => {
        const store = getStore();
        return store.savingsGoals;
      },
      create: async (data) => {
        const store = getStore();
        const record = {
          ...data,
          id: generateId(),
          created_date: getCurrentDate(),
          updated_date: getCurrentDate()
        };
        store.savingsGoals.push(record);
        saveStore(store);
        return record;
      },
      update: async (id, data) => {
        const store = getStore();
        const index = store.savingsGoals.findIndex(item => item.id === id);
        if (index !== -1) {
          store.savingsGoals[index] = {
            ...store.savingsGoals[index],
            ...data,
            updated_date: getCurrentDate()
          };
          saveStore(store);
          return store.savingsGoals[index];
        }
        throw new Error('Record not found');
      },
      delete: async (id) => {
        const store = getStore();
        store.savingsGoals = store.savingsGoals.filter(item => item.id !== id);
        saveStore(store);
      }
    },
    Income: {
      filter: async () => {
        const store = getStore();
        return store.incomes;
      },
      create: async (data) => {
        const store = getStore();
        const record = {
          ...data,
          id: generateId(),
          created_date: getCurrentDate(),
          updated_date: getCurrentDate()
        };
        store.incomes.push(record);
        saveStore(store);
        return record;
      },
      update: async (id, data) => {
        const store = getStore();
        const index = store.incomes.findIndex(item => item.id === id);
        if (index !== -1) {
          store.incomes[index] = {
            ...store.incomes[index],
            ...data,
            updated_date: getCurrentDate()
          };
          saveStore(store);
          return store.incomes[index];
        }
        throw new Error('Record not found');
      },
      delete: async (id) => {
        const store = getStore();
        store.incomes = store.incomes.filter(item => item.id !== id);
        saveStore(store);
      }
    },
    Asset: {
      filter: async () => {
        const store = getStore();
        return store.assets;
      },
      create: async (data) => {
        const store = getStore();
        const record = {
          ...data,
          id: generateId(),
          created_date: getCurrentDate(),
          updated_date: getCurrentDate()
        };
        store.assets.push(record);
        saveStore(store);
        return record;
      },
      update: async (id, data) => {
        const store = getStore();
        const index = store.assets.findIndex(item => item.id === id);
        if (index !== -1) {
          store.assets[index] = {
            ...store.assets[index],
            ...data,
            updated_date: getCurrentDate()
          };
          saveStore(store);
          return store.assets[index];
        }
        throw new Error('Record not found');
      },
      delete: async (id) => {
        const store = getStore();
        store.assets = store.assets.filter(item => item.id !== id);
        saveStore(store);
      }
    },
    OneTimeDeposit: {
      filter: async (query) => {
        const store = getStore();
        if (!query) return store.oneTimeDeposits;
        return store.oneTimeDeposits.filter(item => {
          return Object.keys(query).every(key => item[key] === query[key]);
        });
      },
      create: async (data) => {
        const store = getStore();
        const record = {
          ...data,
          id: generateId(),
          created_date: getCurrentDate(),
          updated_date: getCurrentDate()
        };
        store.oneTimeDeposits.push(record);
        saveStore(store);
        return record;
      },
      update: async (id, data) => {
        const store = getStore();
        const index = store.oneTimeDeposits.findIndex(item => item.id === id);
        if (index !== -1) {
          store.oneTimeDeposits[index] = {
            ...store.oneTimeDeposits[index],
            ...data,
            updated_date: getCurrentDate()
          };
          saveStore(store);
          return store.oneTimeDeposits[index];
        }
        throw new Error('Record not found');
      },
      delete: async (id) => {
        const store = getStore();
        store.oneTimeDeposits = store.oneTimeDeposits.filter(item => item.id !== id);
        saveStore(store);
      }
    },
    PaydayHistory: {
      filter: async () => {
        const store = getStore();
        const history = store.paydayHistory || [];
        return history.sort((a, b) => {
          if (!a.payday_date || !b.payday_date) return 0;
          return b.payday_date.localeCompare(a.payday_date);
        }).slice(0, 10);
      },
      create: async (data) => {
        const store = getStore();
        const record = {
          ...data,
          id: generateId(),
          created_date: getCurrentDate(),
          updated_date: getCurrentDate()
        };
        store.paydayHistory.push(record);
        saveStore(store);
        return record;
      }
    }
  }
};