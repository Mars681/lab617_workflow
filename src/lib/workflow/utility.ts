export const executeLogger = async (context: any) => {
  return { 
    logged: true, 
    timestamp: new Date().toLocaleTimeString(),
    keys: Object.keys(context)
  };
};