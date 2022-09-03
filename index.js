const {ArrayTimSortImpl} = require("./timSort");

exports.TimSort = (array, compare) => {
  const sortState = {
    workArray: array,
    Compare: compare,
    tempArray: [],
    pendingRunsSize: 0,
    pendingRuns: [],

    minGallop: 7,
  };

  ArrayTimSortImpl(sortState);

  return sortState.workArray;
};
