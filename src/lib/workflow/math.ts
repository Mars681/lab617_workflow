export const executeMatrixAdd = async (context: any) => {
  return { 
    result: [[2, 4], [6, 8]], 
    message: "Matrices added successfully (Mock)" 
  };
};

export const executeMatrixMul = async (context: any) => {
  return { 
    result: [[19, 22], [43, 50]], 
    message: "Matrices multiplied successfully (Mock)" 
  };
};

export const executeMatrixInv = async (context: any) => {
  return { 
    result: [[-2, 1], [1.5, -0.5]], 
    message: "Matrix inversion calculated (Mock)" 
  };
};