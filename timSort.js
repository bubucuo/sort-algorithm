// const invariant = require("invariant");

const kMinGallopWins = 7;

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
  MergeForceCollapse(sortState);
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
  const k = GallopRight(
    sortState,
    sortState.workArray,
    keyRight,
    baseA,
    lengthA,
    0
  );

  baseA = baseA + k;
  lengthA = lengthA - k;

  if (lengthA === 0) {
    return;
  }

  // 新的分区A的最大值
  const keyLeft = workArray[baseA + lengthA - 1];

  // array[base+offset]<key<=array[base+offset+1]
  lengthB = GallopLeft(
    sortState,
    sortState.workArray,
    keyLeft,
    baseB,
    lengthB,
    lengthB - 1
  );

  if (lengthB === 0) {
    return;
  }

  // todo
  if (lengthA <= lengthB) {
    MergeLow(sortState, baseA, lengthA, baseB, lengthB);
  } else {
    MergeHigh(sortState, baseA, lengthA, baseB, lengthB);
  }
}

// 合并剩下的分区AB
// 把剩下的分区A存到临时数组tempArray
// workArray[dest++]  = workArray[cursorB++]
// A或者B连续赢得（7次），就可以狂奔（gallop）
function MergeLow(sortState, baseA, lengthAArg, baseB, lengthBArg) {
  // invariant(0 < lengthAArg && 0 < lengthBArg, "length > 0");
  // invariant(0 <= baseA && 0 < baseB, "分区A起始下标>=0, 分区b的起始下标>0");
  // invariant(baseA + lengthAArg == baseB, "AB分区连续");

  let lengthA = lengthAArg;
  let lengthB = lengthBArg;

  const tempArray = new Array(lengthA);

  const workArray = sortState.workArray;

  Copy(workArray, baseA, tempArray, 0, lengthA);

  // 合并分区AB从哪里开始存储元素
  let dest = baseA;
  // 最新分区B的起始下标
  let cursorB = baseB;

  // 临时数组的遍历下表
  let cursorTemp = 0;

  workArray[dest++] = workArray[cursorB++];

  if (--lengthB === 0) {
    Succeed();
    return;
  }

  if (lengthA === 1) {
    // 那么临时数组的当前值就是比分区B剩余的元素要大
    CopyB();
    return;
  }

  let minGallop = sortState.minGallop;
  while (1) {
    // invariant(lengthA > 1 && lengthB > 0, "wrong length");

    let nofWinsA = 0;
    let nofWinsB = 0;

    while (1) {
      // invariant(lengthA > 1 && lengthB > 0, "wrong length");

      const order = sortState.Compare(
        workArray[cursorB],
        tempArray[cursorTemp]
      );

      if (order < 0) {
        workArray[dest++] = workArray[cursorB++];

        ++nofWinsB;
        --lengthB;
        nofWinsA = 0;

        if (lengthB == 0) {
          Succeed();
          return;
        }
        if (nofWinsB >= minGallop) {
          break;
        }
      } else {
        workArray[dest++] = tempArray[cursorTemp++];

        nofWinsA++;
        --lengthA;
        nofWinsB = 0;

        if (lengthA === 1) {
          CopyB();
          return;
        }
        if (nofWinsA >= minGallop) {
          break;
        }
      }
    }

    // 狂奔 gallop
    ++minGallop;

    let firstIteration = true;
    while (
      nofWinsA >= kMinGallopWins ||
      nofWinsB >= kMinGallopWins ||
      firstIteration
    ) {
      firstIteration = false;
      // invariant(lengthA > 1 && lengthB > 0, "wrong length");

      minGallop = Math.max(1, minGallop - 1);

      sortState.minGallop = minGallop;

      nofWinsA = GallopRight(
        sortState,
        tempArray,
        workArray[cursorB],
        cursorTemp,
        lengthA,
        0
      );

      // invariant(nofWinsA >= 0, "offset nofWinsA>0");

      if (nofWinsA > 0) {
        Copy(tempArray, cursorTemp, workArray, dest, nofWinsA);

        dest += nofWinsA;
        cursorTemp += nofWinsA;
        lengthA -= nofWinsA;

        if (lengthA === 1) {
          CopyB();
          return;
        }

        if (lengthA === 0) {
          Succeed();
          return;
        }
      }

      //
      workArray[dest++] = workArray[cursorB++];
      if (--lengthB === 0) {
        Succeed();
        return;
      }

      nofWinsB = GallopLeft(
        sortState,
        workArray,
        tempArray[cursorTemp],
        cursorB,
        lengthB,
        0
      );

      // invariant(nofWinsB >= 0, "wrong offset of B");

      if (nofWinsB > 0) {
        Copy(workArray, cursorB, workArray, dest, nofWinsB);

        dest += nofWinsB;
        cursorB += nofWinsB;
        lengthB -= nofWinsB;

        if (lengthB === 0) {
          Succeed();
          return;
        }
      }

      workArray[dest++] = tempArray[cursorTemp++];
      if (--lengthA == 1) {
        CopyB();
        return;
      }
    }

    ++minGallop;
    sortState.minGallop = minGallop;
  }

  // 剩余的分区B没有元素,把临时数组TempArray拷贝到WorkArray
  function Succeed() {
    if (lengthA > 0) {
      Copy(tempArray, cursorTemp, workArray, dest, lengthA);
    }
  }

  // 分区A只剩下一个元素
  function CopyB() {
    // invariant(lengthA === 1 && lengthB > 0, "wrong length !");
    Copy(workArray, cursorB, workArray, dest, lengthB);
    workArray[dest + lengthB] = tempArray[cursorTemp];
  }
}

// 合并剩下的分区AB
// 把剩下的分区B存到临时数组tempArray
// workArray[dest--]  = workArray[cursorA--]
// A或者B连续赢得（7次），就可以狂奔（gallop）

// runA 001 34
// runB 2 45678
function MergeHigh(sortState, baseA, lengthAArg, baseB, lengthBArg) {
  // invariant(0 < lengthAArg && 0 < lengthBArg, "length > 0");
  // invariant(0 <= baseA && 0 < baseB, "分区A起始下标>=0, 分区b的起始下标>0");
  // invariant(baseA + lengthAArg == baseB, "AB分区连续");

  let lengthA = lengthAArg;
  let lengthB = lengthBArg;

  const tempArray = new Array(lengthBArg);

  const workArray = sortState.workArray;

  Copy(workArray, baseB, tempArray, 0, lengthB);

  let dest = baseB + lengthB - 1;
  let cursorA = baseA + lengthA - 1;

  let cursorTemp = lengthB - 1;

  workArray[dest--] = workArray[cursorA--];

  if (--lengthA === 0) {
    Succeed();
    return;
  }

  if (lengthB === 1) {
    CopyA();
    return;
  }

  let minGallop = sortState.minGallop;

  while (1) {
    let nofWinsA = 0;
    let nofWinsB = 0;

    while (1) {
      const order = sortState.Compare(
        tempArray[cursorTemp],
        workArray[cursorA]
      );
      if (order < 0) {
        workArray[dest--] = workArray[cursorA--];

        ++nofWinsA;
        --lengthA;
        nofWinsB = 0;

        if (lengthA === 0) {
          Succeed();
          return;
        }
        if (nofWinsA >= minGallop) {
          break;
        }
      } else {
        workArray[dest--] = tempArray[cursorTemp--];

        ++nofWinsB;
        --lengthB;
        nofWinsA = 0;

        if (lengthB === 1) {
          CopyA();
          return;
        }
        if (nofWinsB >= minGallop) {
          break;
        }
      }
    }

    ++minGallop;
    let firstIteration = true;
    while (
      nofWinsA >= kMinGallopWins ||
      nofWinsB >= kMinGallopWins ||
      firstIteration
    ) {
      firstIteration = false;
      // invariant(lengthA > 0 && lengthB > 1, "");

      minGallop = Math.max(1, minGallop - 1);

      sortState.minGallop = minGallop;
      // 从分区A中进行快速查找,key是分区B的最大值
      let k = GallopRight(
        sortState,
        workArray,
        tempArray[cursorTemp],
        baseA,
        lengthA,
        lengthA - 1
      );

      // invariant(k >= 0, "wrong offset k");

      nofWinsA = lengthA - k;

      if (nofWinsA > 0) {
        dest = dest - nofWinsA;
        cursorA = cursorA - nofWinsA;

        Copy(workArray, cursorA + 1, workArray, dest + 1, nofWinsA);

        lengthA -= nofWinsA;

        if (lengthA === 0) {
          Succeed();
          return;
        }
      }

      workArray[dest--] = tempArray[cursorTemp--];
      if (--lengthB === 1) {
        CopyA();
        return;
      }

      // 在b分区中快速查找
      k = GallopLeft(
        sortState,
        tempArray,
        // sy
        workArray[cursorA],
        0,
        lengthB,
        lengthB - 1
      );
      // invariant(k >= 0, "wrong offset k");

      nofWinsB = lengthB - k;

      if (nofWinsB > 0) {
        dest = dest - nofWinsB;
        cursorTemp = cursorTemp - nofWinsB;

        Copy(tempArray, cursorTemp + 1, workArray, dest + 1, nofWinsB);

        lengthB -= nofWinsB;

        if (lengthB === 1) {
          CopyA();
          return;
        }

        if (lengthB === 0) {
          // Succeed()
          return;
        }
      }

      workArray[dest--] = workArray[cursorA--];

      if (--lengthA == 0) {
        Succeed();
        return;
      }
    }

    ++minGallop;
    sortState.minGallop = minGallop;
  }

  // lengthA==0
  function Succeed() {
    if (lengthB > 0) {
      // invariant(lengthA === 0, "lengthA should be 0");

      Copy(tempArray, 0, workArray, dest - lengthB + 1, lengthB);
    }
  }

  function CopyA() {
    // invariant(lengthB === 1 && lengthA > 0, "wrong");
    dest = dest - lengthA;
    cursorA = cursorA - lengthA;

    Copy(workArray, cursorA + 1, workArray, dest + 1, lengthA);
    workArray[dest] = tempArray[cursorTemp];
  }
}

function Copy(source, srcPos, target, dstPos, length) {
  // invariant(srcPos >= 0, "srcPos 下标>=0");
  // invariant(dstPos >= 0, "dstPos 下标>=0");
  // invariant(srcPos <= source.length - length, "数据不够");
  // invariant(dstPos <= target.length - length, "空间不够");

  // source和target可能是同个数组
  if (srcPos < dstPos) {
    let srcIdx = srcPos + length - 1;
    let dstIdx = dstPos + length - 1;
    while (srcIdx >= srcPos) {
      target[dstIdx--] = source[srcIdx--];
    }
  } else {
    let srcIdx = srcPos;
    let dstIdx = dstPos;
    const to = srcPos + length;
    while (srcIdx < to) {
      target[dstIdx++] = source[srcIdx++];
    }
  }
}
// todo
// array[base+offset-1] <=key<array[base+offset]
//hint标记从分区中的哪里开始搜索
function GallopRight(sortState, array, key, base, length, hint) {
  const workArray = sortState.workArray;

  let lastOfs = 0;
  let offset = 1;

  const baseHintElement = array[base + hint];
  let order = sortState.Compare(key, baseHintElement);

  if (order < 0) {
    const maxOfs = hint + 1;
    while (offset < maxOfs) {
      const offsetElement = array[base + hint - offset];
      order = sortState.Compare(key, offsetElement);

      if (order >= 0) {
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

    const tmp = lastOfs;
    lastOfs = hint - offset;
    offset = hint - tmp;
  } else {
    const maxOfs = length - hint;

    while (offset < maxOfs) {
      const offsetElement = array[base + hint + offset];
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

    order = sortState.Compare(key, array[base + m]);

    if (order < 0) {
      // 左区间
      offset = m;
    } else {
      lastOfs = m + 1;
    }
  }

  // // invariant(offset === 0, "wrong offset");
  return offset;
}

// array[base+offset]<key<=array[base+offset+1]
//hint标记从分区中的哪里开始搜索
function GallopLeft(sortState, array, key, base, length, hint) {
  const workArray = sortState.workArray;

  let lastOfs = 0;
  let offset = 1;

  // 分区B的最大值
  const baseHintElement = array[base + hint];
  let order = sortState.Compare(baseHintElement, key);

  if (order < 0) {
    const maxOfs = length - hint;
    while (offset < maxOfs) {
      const offsetElement = array[base + hint + offset];
      order = sortState.Compare(offsetElement, key);

      if (order >= 0) {
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
  } else {
    // baseHintElement>=key
    const maxOfs = hint + 1;

    while (offset < maxOfs) {
      const offsetElement = array[base + hint - offset];
      order = sortState.Compare(offsetElement, key);

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

    const tmp = lastOfs;
    lastOfs = hint - offset;
    offset = hint - tmp;
  }

  lastOfs++;

  // 二分查找，查找具体的位置
  while (lastOfs < offset) {
    const m = lastOfs + ((offset - lastOfs) >> 1);

    order = sortState.Compare(array[base + m], key);

    if (order < 0) {
      // 右边
      lastOfs = m + 1;
    } else {
      offset = m;
    }
  }

  return offset;
}

function MergeForceCollapse(sortState) {
  const pendingRuns = sortState.pendingRuns;

  // Reload the stack size because MergeAt might change it.
  while (sortState.pendingRunsSize > 1) {
    let n = sortState.pendingRunsSize - 2;

    if (
      n > 0 &&
      GetPendingRunLength(pendingRuns, n - 1) <
        GetPendingRunLength(pendingRuns, n + 1)
    ) {
      --n;
    }
    MergeAt(sortState, n);
  }
}

exports.ArrayTimSortImpl = ArrayTimSortImpl;
exports.GallopLeft = GallopLeft;
