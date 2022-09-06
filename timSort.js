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
  const minRunLength = ComputeMinRunLength(remaining);

  while (remaining !== 0) {
    // 寻找分区，并返回分区长度值
    let currentRunLength = CountAndMakeRun(sortState, low, low + remaining);
    if (currentRunLength < minRunLength) {
      // 扩展分区
      const forceRunLength = Math.min(minRunLength, remaining);
      BinaryInsertionSort(
        sortState,
        low,
        low + currentRunLength,
        low + forceRunLength
      );

      currentRunLength = forceRunLength;
    }

    // 分区入栈
    PushRun(sortState, low, currentRunLength);

    // 合并分区
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

  let previousElement = elementLow;
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

// if n < 64, return n。 此时采用二分插入排序
// else if n 是 2 的幂， return 32
// else return k,  32 <= k <= 64,
function ComputeMinRunLength(nArg) {
  let n = nArg;
  let r = 0;

  while (n >= 64) {
    r = r | (n & 1);
    n = n >> 1;
  }

  const minRunLength = n + r;
  return minRunLength;
}

function BinaryInsertionSort(sortState, low, startArg, high) {
  const workArray = sortState.workArray;
  let start = low === startArg ? startArg + 1 : startArg;

  for (; start < high; ++start) {
    let left = low,
      right = start;

    const pivot = workArray[right];

    while (left < right) {
      const mid = left + ((right - left) >> 1);
      const order = sortState.Compare(pivot, workArray[mid]);

      if (order < 0) {
        // 左边
        right = mid;
      } else {
        left = mid + 1;
      }
    }

    for (let p = start; p > left; --p) {
      workArray[p] = workArray[p - 1];
    }
    workArray[left] = pivot;
  }
}

// base是分区的起始下标，length就是分区长度
function PushRun(sortState, base, length) {
  const stackSize = sortState.pendingRunsSize;

  SetPendingRunBase(sortState.pendingRuns, stackSize, base);
  SetPendingRunLength(sortState.pendingRuns, stackSize, length);

  sortState.pendingRunsSize = stackSize + 1;
}

function GetPendingRunBase(pendingRuns, run) {
  return pendingRuns[run << 1];
}

function SetPendingRunBase(pendingRuns, run, value) {
  pendingRuns[run << 1] = value;
}

function GetPendingRunLength(pendingRuns, run) {
  return pendingRuns[(run << 1) + 1];
}

function SetPendingRunLength(pendingRuns, run, value) {
  pendingRuns[(run << 1) + 1] = value;
}

exports.ArrayTimSortImpl = ArrayTimSortImpl;
