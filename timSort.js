function ArrayTimSortImpl(sortState) {
  const length = sortState.workArray.length;
  if (length < 2) {
    return;
  }

  // 遍历数组，寻找分区、合并分区

  let low = 0;
  // 数组还剩下多少个
  let remaining = length;

  // 计算分区的最小长度值
  // const minRunLength = ComputeMinRunLength(remaining);

  while (remaining !== 0) {
    // 寻找分区，并返回分区长度值
    let currentRunLength = CountAndMakeRun(sortState, low, low + remaining);
    // if (currentRunLength < minRunLength) {
    //   // 扩展分区
    //   const forceRunLength = Math.min(minRunLength, remaining);
    //   BinaryInsertionSort(
    //     sort,
    //     low,
    //     low + currentRunLength,
    //     low + forceRunLength
    //   );

    //   currentRunLength = forceRunLength;
    // }

    // // 分区入栈
    // PushRun(sortState, low, currentRunLength);

    // // 合并分区
    // MergeCollapse(sortState);

    // 寻找下一个分区
    low = low + currentRunLength;
    remaining = remaining - currentRunLength;
  }

  // 合并栈中的所有的所有分区， 直到只剩下一个，排序结束
  // MergeForceCollapse(sortState);
}

// 寻找分区，并返回分区长度值
function CountAndMakeRun(sortState, lowArg, high) {
  const low = lowArg + 1;
  if (low === high) {
    return 1;
  }

  let runLength = 2;

  const workArray = sortState.workArray;
  const elementLow = workArray[low];
  const elementLowPre = workArray[low - 1];
  let order = sortState.Compare(elementLow, elementLowPre);

  //根据前两个元素来判断是否是降序
  const isDescending = order < 0;

  const previousElement = elementLow;
  for (let idx = low + 1; idx < high; idx++) {
    const currentElement = workArray[idx];
    order = sortState.Compare(currentElement, previousElement);

    if (isDescending) {
      // 严格降序
      if (order >= 0) {
        break;
      }
    } else {
      // 升序
      if (order < 0) {
        break;
      }
    }

    previousElement = currentElement;
    ++runLength;
  }

  // 如果得到的是严格降序子序列，翻转就行了
  if (isDescending) {
    ReverseRange(workArray, lowArg, lowArg + runLength);
  }
  return runLength;
}

// 根据数组下标翻转数组
function ReverseRange(array, from, to) {
  let low = from,
    high = to - 1;
  while (low < high) {
    const elementLow = array[low];
    const elementHigh = array[high];

    array[low++] = elementHigh;
    array[high--] = elementLow;
  }
}

function ComputeMinRunLength() {}

function BinaryInsertionSort() {}

function PushRun() {}

function MergeCollapse() {}

exports.ArrayTimSortImpl = ArrayTimSortImpl;
