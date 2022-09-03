const {ArrayTimSortImpl} = require("./timSort");

exports.TimSort = (array, compare = (a, b) => a - b) => {
  const sortState = {
    workArray: array,
    Compare: compare,
    // tempArray: [],
    // pendingRunsSize: 0,
    // pendingRuns: [],

    // minGallop: 7,
  };

  ArrayTimSortImpl(sortState);

  // 返回有序数组
  return sortState.workArray;
};
