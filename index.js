const {ArrayTimSortImpl} = require("./timSort");

exports.TimSort = (array, compare = (a, b) => a - b) => {
  const sortState = {
    workArray: array,
    Compare: compare,
    tempArray: [],
    // 记录分区的个数
    pendingRunsSize: 0,
    // 记录分区信息的栈
    pendingRuns: [],

    minGallop: 7,
  };

  ArrayTimSortImpl(sortState);

  // 返回有序数组
  return sortState.workArray;
};
