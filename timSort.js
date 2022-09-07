const invariant = require("invariant");

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
    MergeCollapse(sortState);

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

// 如果run_length(n - 2) > run_length(n - 1) + run_length(n)，返回true
function RunInvariantEstablished(pendingRuns, n) {
  if (n < 2) return true;

  const runLengthN = GetPendingRunLength(pendingRuns, n);
  const runLengthNM = GetPendingRunLength(pendingRuns, n - 1);
  const runLengthNMM = GetPendingRunLength(pendingRuns, n - 2);

  return runLengthNMM > runLengthNM + runLengthN;
}

function MergeCollapse(sortState) {
  const pendingRuns = sortState.pendingRuns;

  while (sortState.pendingRunsSize > 1) {
    let n = sortState.pendingRunsSize - 2;

    if (
      !RunInvariantEstablished(pendingRuns, n + 1) ||
      !RunInvariantEstablished(pendingRuns, n)
    ) {
      if (
        GetPendingRunLength(pendingRuns, n - 1) <
        GetPendingRunLength(pendingRuns, n + 1)
      ) {
        --n;
      }
      MergeAt(sortState, n);
    } else if (
      GetPendingRunLength(pendingRuns, n) <=
      GetPendingRunLength(pendingRuns, n + 1)
    ) {
      MergeAt(sortState, n);
    } else {
      break;
    }
  }
}

// 合并分区i和i+1

// 001  4 34
// runA 001 4
// runB 23 45678
function MergeAt(sortState, i) {
  const workArray = sortState.workArray;
  const pendingRuns = sortState.pendingRuns;

  // 分区A的起始下标
  let baseA = GetPendingRunBase(pendingRuns, i);
  // 分区A的长度
  let lengthA = GetPendingRunLength(pendingRuns, i);

  // 分区B的起始下标
  let baseB = GetPendingRunBase(pendingRuns, i + 1);
  // 分区B的长度
  let lengthB = GetPendingRunLength(pendingRuns, i + 1);

  // 修改新分区的长度
  SetPendingRunLength(pendingRuns, i, lengthA + lengthB);

  if (i === sortState.pendingRunsSize - 3) {
    // 如果i是倒数第三个分区，合并就是倒数第二和倒数第三，那么倒数第一个分区
    // 倒数第一个分区的下标和长度
    const base = GetPendingRunBase(pendingRuns, i + 2);
    const length = GetPendingRunLength(pendingRuns, i + 2);

    SetPendingRunBase(pendingRuns, i + 1, base);
    SetPendingRunLength(pendingRuns, i + 1, length);
  }

  // 总分区个数-1
  sortState.pendingRunsSize--;

  const keyRight = workArray[baseB];
  // array[base+offset-1] <=key<array[base+offset]
  const k = GallopRight(sortState, keyRight, baseA, lengthA, 0);

  baseA = baseA + k;
  lengthA = lengthA - k;

  if (lengthA === 0) {
    return;
  }

  // 新的分区A的最大值
  const keyLeft = workArray[baseA + lengthA - 1];

  // array[base+offset]<key<=array[base+offset+1]
  lengthB = GallopLeft(sortState, keyLeft, baseB, lengthB, lengthB - 1);

  if (lengthB === 0) {
    return;
  }

  // todo
  // if (lengthA <= lengthB) {
  //   MergeLow();
  // } else {
  //   MergeHigh();
  // }
}

// todo
// array[base+offset-1] <=key<array[base+offset]
//hint标记从分区中的哪里开始搜索
function GallopRight(sortState, key, base, length, hint) {
  const workArray = sortState.workArray;
  console.log(
    "%c [  ]-288",
    "font-size:13px; background:pink; color:#bf2c9f;",
    sortState,
    key,
    base,
    length,
    hint
  );

  let lastOfs = 0;
  let offset = 1;

  const baseHintElement = workArray[base + hint];
  let order = sortState.Compare(key, baseHintElement);

  if (order < 0) {
    const maxOfs = hint + 1;
    while (offset < maxOfs) {
      const offsetElement = workArray[base + hint - offset];
      order = sortState.Compare(key, offsetElement);

      if (order >= 0) {
        break;
      }

      lastOfs = offset;
      offset = (offset << 1) + 1;
      if (pageXOffset <= 0) {
        offset = maxOfs;
      }
    }

    if (offset > maxOfs) {
      offset = maxOfs;
    }

    const tmp = lastOfs;
    lastOfs = hint - offset;
    offset = hint - tmp;
  } else {
    const maxOfs = length - hint;

    while (offset < maxOfs) {
      const offsetElement = workArray[base + hint + offset];
      order = sortState.Compare(key, offsetElement);
      if (order < 0) {
        break;
      }

      lastOfs = offset;
      offset = (offset << 1) + 1;
      if (offset <= 0) {
        offset = maxOfs;
      }
    }

    if (offset > maxOfs) {
      offset = maxOfs;
    }

    lastOfs = lastOfs + hint;
    offset = offset + hint;
  }

  lastOfs++;
  while (lastOfs < offset) {
    const m = lastOfs + ((offset - lastOfs) >> 1);

    order = sortState.Compare(key, workArray[base + m]);

    if (order < 0) {
      // 左区间
      offset = m;
    } else {
      lastOfs = m + 1;
    }
  }

  invariant(offset === 0, "wrong offset");
  return offset;
}

// array[base+offset]<key<=array[base+offset+1]
function GallopLeft() {}

exports.ArrayTimSortImpl = ArrayTimSortImpl;
