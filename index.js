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

const kMinGallopWins = 7;

function ArrayTimSortImpl(sortState) {
  const length = sortState.workArray.length;
  // 数组长度是0或者1，不用排序
  if (length < 2) return;
  let remaining = length;

  // 从左到右遍历数组，寻找所有分区。
  let low = 0;
  // 计算分区的最小长度值
  const minRunLength = ComputeMinRunLength(remaining);

  console.log("minRunLength", minRunLength); //sy-log
  while (remaining != 0) {
    // 得到当前分区的长度
    let currentRunLength = CountAndMakeRun(sortState, low, low + remaining);

    // If the run is short, extend it to min(minRunLength, remaining).
    // 如果分区太短，则扩展
    if (currentRunLength < minRunLength) {
      const forcedRunLength = Math.min(minRunLength, remaining);
      BinaryInsertionSort(
        sortState,
        low,
        low + currentRunLength,
        low + forcedRunLength
      );
      currentRunLength = forcedRunLength;
    }

    // Push run onto pending-runs stack, and maybe merge.
    PushRun(sortState, low, currentRunLength);

    MergeCollapse(sortState);

    // 继续寻找下一个run
    low = low + currentRunLength;
    remaining = remaining - currentRunLength;
  }

  // MergeForceCollapse(context, sortState);

  // dcheck(GetPendingRunsSize(sortState) == 1);
  // dcheck(GetPendingRunLength(sortState.pendingRuns, 0) == length);
}

function PushRun(sortState, base, length) {
  const stackSize = sortState.pendingRunsSize;

  SetPendingRunBase(sortState.pendingRuns, stackSize, base);
  SetPendingRunLength(sortState.pendingRuns, stackSize, length);

  sortState.pendingRunsSize = stackSize + 1;
}

// Examines the stack of runs waiting to be merged, merging adjacent runs
// until the stack invariants are re-established:
// 检查待合并分区的栈，合并相邻分区，直到栈被重建
//
//   1. run_length(i - 3) > run_length(i - 2) + run_length(i - 1)
//   2. run_length(i - 2) > run_length(i - 1)
//
// TODO(szuend): Remove unnecessary loads. This macro was refactored to
//               improve readability, introducing unnecessary loads in the
//               process. Determine if all these extra loads are ok.
function MergeCollapse(sortState) {
  const pendingRuns = sortState.pendingRuns;

  // Reload the stack size because MergeAt might change it.
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
// Returns true if run_length(n - 2) > run_length(n - 1) + run_length(n).
function RunInvariantEstablished(pendingRuns, n) {
  if (n < 2) return true;

  const runLengthN = GetPendingRunLength(pendingRuns, n);
  const runLengthNM = GetPendingRunLength(pendingRuns, n - 1);
  const runLengthNMM = GetPendingRunLength(pendingRuns, n - 2);

  return runLengthNMM > runLengthNM + runLengthN;
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

// 二分插入排序是最好的排序短数组的最好方法，因为它很少做比较，而js中比较是很昂贵的。
//
//  [low, high) 是数组中的连续空间，接下来将会通过二分插入来实现稳定排序
//
// 此函数调用的前提：low <= start <= high 且 [low, start) 区间段是有序的
function BinaryInsertionSort(sortState, low, startArg, high) {
  const workArray = sortState.workArray;

  let start = low == startArg ? startArg + 1 : startArg;

  for (; start < high; ++start) {
    // Set left to where a[start] belongs.
    let left = low;
    let right = start;

    const pivot = workArray[right];

    // Invariants:
    //   pivot >= all in [low, left).
    //   pivot  < all in [right, start).

    // Find pivot insertion point.
    while (left < right) {
      const mid = left + ((right - left) >> 1);
      const order = sortState.Compare(pivot, workArray[mid]);

      if (order < 0) {
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

/**
 * workArray 数组
 * lowArg 起始位置下标
 * high 结束位置下标+1
 * Compare 比较函数，如: (a,b)=>a-b
 * 返回分区的长度
 */
function CountAndMakeRun(sortState, lowArg, high) {
  const low = lowArg + 1;
  // 只有一个元素，返回即可
  if (low == high) return 1;

  let runLength = 2;
  const workArray = sortState.workArray;
  const elementLow = workArray[low];
  const elementLowPred = workArray[low - 1];
  let order = sortState.Compare(elementLow, elementLowPred);

  // 根据前两个元素来判断是否是降序？
  const isDescending = order < 0 ? true : false;

  let previousElement = elementLow;
  for (let idx = low + 1; idx < high; ++idx) {
    const currentElement = workArray[idx];
    order = sortState.Compare(currentElement, previousElement);

    if (isDescending) {
      // 前两个元素是严格降序，那么接下来要得到的分区就应该是就应该是连续降序子序列，如果又忽然出现较大的值，不再满足降序，break
      if (order >= 0) break;
    } else {
      // 前两个元素是升序，那么接下来要得到的分区就应该是就应该是连续升序子序列，如果又忽然出现较小的值，不再满足升序，break
      if (order < 0) break;
    }

    previousElement = currentElement;
    ++runLength;
  }

  // 如果得到的是严格降序子序列，翻转即可
  // 因为，我们要的分区必须得是升序的
  if (isDescending) {
    ReverseRange(workArray, lowArg, lowArg + runLength);
  }

  return runLength;
}

// 把数组 array 从 from 到 to 翻转
function ReverseRange(array, from, to) {
  let low = from;
  let high = to - 1;

  while (low < high) {
    const elementLow = array[low];
    const elementHigh = array[high];
    array[low++] = elementHigh;
    array[high--] = elementLow;
  }
}

// See listsort.txt for more info.
// if n < 64, return n
// else if n 是 2 的整数次方， return 32
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

//  * merge
// Merges the two runs at stack indices i and i + 1.
// Returns kFailure if we need to bailout, kSuccess otherwise.
function MergeAt(sortState, i) {
  const stackSize = sortState.pendingRunsSize;

  const workArray = sortState.workArray;

  const pendingRuns = sortState.pendingRuns;
  let baseA = GetPendingRunBase(pendingRuns, i);
  let lengthA = GetPendingRunLength(pendingRuns, i);
  const baseB = GetPendingRunBase(pendingRuns, i + 1);
  let lengthB = GetPendingRunLength(pendingRuns, i + 1);

  // Record the length of the combined runs; if i is the 3rd-last run now,
  // also slide over the last run (which isn't involved in this merge).
  // The current run i + 1 goes away in any case.
  SetPendingRunLength(pendingRuns, i, lengthA + lengthB);
  if (i == stackSize - 3) {
    const base = GetPendingRunBase(pendingRuns, i + 2);
    const length = GetPendingRunLength(pendingRuns, i + 2);
    SetPendingRunBase(pendingRuns, i + 1, base);
    SetPendingRunLength(pendingRuns, i + 1, length);
  }
  sortState.pendingRunsSize = stackSize - 1;

  // Where does b start in a? Elements in a before that can be ignored,
  // because they are already in place.
  const keyRight = workArray[baseB];
  const k = GallopRight(sortState, workArray, keyRight, baseA, lengthA, 0);

  baseA = baseA + k;
  lengthA = lengthA - k;
  if (lengthA == 0) return 1; //kSuccess;

  // Where does a end in b? Elements in b after that can be ignored,
  // because they are already in place.
  const keyLeft = workArray[baseA + lengthA - 1];
  lengthB = GallopLeft(
    sortState,
    workArray,
    keyLeft,
    baseB,
    lengthB,
    lengthB - 1
  );
  if (lengthB == 0) return 11; //kSuccess;

  // Merge what remains of the runs, using a temp array with
  // min(lengthA, lengthB) elements.
  if (lengthA <= lengthB) {
    MergeLow(sortState, baseA, lengthA, baseB, lengthB);
  } else {
    MergeHigh(sortState, baseA, lengthA, baseB, lengthB);
  }
  return 1; //kSuccess;
}

// Exactly like GallopLeft, except that if key already exists in
// [base, base + length), finds the position immediately to the right of
// the rightmost equal value.
//
// The return value is the int offset in 0..length such that
//
// array[base + offset - 1] <= key < array[base + offset]
//
// or kFailure on error.
function GallopRight(sortState, array, key, base, length, hint) {
  let lastOfs = 0;
  let offset = 1;

  // const array = sortState.workArray;
  const baseHintElement = array[base + hint];
  let order = sortState.Compare(key, baseHintElement);

  if (order < 0) {
    // key < a[base + hint]: gallop left, until
    // a[base + hint - offset] <= key < a[base + hint - lastOfs].

    // a[base + hint] is lowest.
    const maxOfs = hint + 1;
    while (offset < maxOfs) {
      const offsetElement = array[base + hint - offset];
      order = sortState.Compare(key, offsetElement);

      if (order >= 0) break;

      lastOfs = offset;
      offset = (offset << 1) + 1;

      // Integer overflow.
      if (offset <= 0) offset = maxOfs;
    }

    if (offset > maxOfs) offset = maxOfs;

    // Translate back to positive offsets relative to base.
    const tmp = lastOfs;
    lastOfs = hint - offset;
    offset = hint - tmp;
  } else {
    // a[base + hint] <= key: gallop right, until
    // a[base + hint + lastOfs] <= key < a[base + hint + offset].

    // a[base + length - 1] is highest.
    const maxOfs = length - hint;
    while (offset < maxOfs) {
      const offsetElement = array[base + hint + offset];
      order = sortState.Compare(key, offsetElement);

      // a[base + hint + ofs] <= key.
      if (order < 0) break;

      lastOfs = offset;
      offset = (offset << 1) + 1;

      // Integer overflow.
      if (offset <= 0) offset = maxOfs;
    }

    if (offset > maxOfs) offset = maxOfs;

    // Translate back to positive offests relative to base.
    lastOfs = lastOfs + hint;
    offset = offset + hint;
  }

  // Now a[base + lastOfs] <= key < a[base + ofs], so key belongs
  // somewhere to the right of lastOfs but no farther right than ofs.
  // Do a binary search, with invariant
  // a[base + lastOfs - 1] < key <= a[base + ofs].
  lastOfs++;
  while (lastOfs < offset) {
    const m = lastOfs + ((offset - lastOfs) >> 1);

    order = sortState.Compare(key, array[base + m]);

    if (order < 0) {
      offset = m; // key < a[base + m].
    } else {
      lastOfs = m + 1; // a[base + m] <= key.
    }
  }
  // so a[base + offset - 1] <= key < a[base + offset].
  return offset;
}

// Locates the proper position of key in a sorted array; if the array
// contains an element equal to key, return the position immediately to
// the left of the leftmost equal element. (GallopRight does the same
// except returns the position to the right of the rightmost equal element
// (if any)).
//
// The array is sorted with "length" elements, starting at "base".
// "length" must be > 0.
//
// "hint" is an index at which to begin the search, 0 <= hint < n. The
// closer hint is to the final result, the faster this runs.
//
// The return value is the int offset in 0..length such that
//
// array[base + offset] < key <= array[base + offset + 1]
//
// pretending that array[base - 1] is minus infinity and array[base + len]
// is plus infinity. In other words, key belongs at index base + k.
function GallopLeft(sortState, array, key, base, length, hint) {
  let lastOfs = 0;
  let offset = 1;

  // const array = sortState.workArray;
  const baseHintElement = array[base + hint];
  let order = sortState.Compare(baseHintElement, key);

  if (order < 0) {
    // a[base + hint] < key: gallop right, until
    // a[base + hint + lastOfs] < key <= a[base + hint + offset].

    // a[base + length - 1] is highest.
    const maxOfs = length - hint;
    while (offset < maxOfs) {
      const offsetElement = array[base + hint + offset];
      order = sortState.Compare(offsetElement, key);

      // a[base + hint + offset] >= key? Break.
      if (order >= 0) break;

      lastOfs = offset;
      offset = (offset << 1) + 1;

      // Integer overflow.
      if (offset <= 0) offset = maxOfs;
    }

    if (offset > maxOfs) offset = maxOfs;

    // Translate back to positive offsets relative to base.
    lastOfs = lastOfs + hint;
    offset = offset + hint;
  } else {
    // key <= a[base + hint]: gallop left, until
    // a[base + hint - offset] < key <= a[base + hint - lastOfs].

    // a[base + hint] is lowest.
    const maxOfs = hint + 1;
    while (offset < maxOfs) {
      const offsetElement = array[base + hint - offset];
      order = sortState.Compare(offsetElement, key);

      if (order < 0) break;

      lastOfs = offset;
      offset = (offset << 1) + 1;

      // Integer overflow.
      if (offset <= 0) offset = maxOfs;
    }

    if (offset > maxOfs) offset = maxOfs;

    // Translate back to positive offsets relative to base.
    const tmp = lastOfs;
    lastOfs = hint - offset;
    offset = hint - tmp;
  }

  // Now a[base+lastOfs] < key <= a[base+offset], so key belongs
  // somewhere to the right of lastOfs but no farther right than offset.
  // Do a binary search, with invariant:
  //   a[base + lastOfs - 1] < key <= a[base + offset].
  lastOfs++;
  while (lastOfs < offset) {
    const m = lastOfs + ((offset - lastOfs) >> 1);

    order = sortState.Compare(array[base + m], key);

    if (order < 0) {
      lastOfs = m + 1; // a[base + m] < key.
    } else {
      offset = m; // key <= a[base + m].
    }
  }
  // so a[base + offset - 1] < key <= a[base + offset].
  return offset;
}

// Merge the lengthA elements starting at baseA with the lengthB elements
// starting at baseB in a stable way, in-place. lengthA and lengthB must
// be > 0, and baseA + lengthA == baseB. Must also have that
// array[baseB] < array[baseA],
// that array[baseA + lengthA - 1] belongs at the end of the merge,
// and should have lengthA <= lengthB.
function MergeLow(sortState, baseA, lengthAArg, baseB, lengthBArg) {
  let lengthA = lengthAArg;
  let lengthB = lengthBArg;

  const workArray = sortState.workArray;
  const tempArray = GetTempArray(sortState, lengthA);
  Copy(workArray, baseA, tempArray, 0, lengthA);

  let dest = baseA;
  let cursorTemp = 0;
  let cursorB = baseB;

  workArray[dest++] = workArray[cursorB++];

  try {
    if (--lengthB == 0) {
      //goto Succeed;
      if (lengthA > 0) {
        Copy(tempArray, cursorTemp, workArray, dest, lengthA);
      }
      return;
    }
    if (lengthA == 1) {
      //goto CopyB;
      Copy(workArray, cursorB, workArray, dest, lengthB);
      workArray[dest + lengthB] = tempArray[cursorTemp];
      return;
    }

    let minGallop = sortState.minGallop;
    // TODO(szuend): Replace with something that does not have a runtime
    //               overhead as soon as its available in Torque.
    while (1) {
      let nofWinsA = 0; // # of times A won in a row.
      let nofWinsB = 0; // # of times B won in a row.

      // Do the straightforward thing until (if ever) one run appears to
      // win consistently.
      // TODO(szuend): Replace with something that does not have a runtime
      //               overhead as soon as its available in Torque.
      while (1) {
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
            //goto Succeed;
            if (lengthA > 0) {
              Copy(tempArray, cursorTemp, workArray, dest, lengthA);
            }
            return;
          }
          if (nofWinsB >= minGallop) break;
        } else {
          workArray[dest++] = tempArray[cursorTemp++];

          ++nofWinsA;
          --lengthA;
          nofWinsB = 0;

          if (lengthA == 1) {
            //goto CopyB;
            Copy(workArray, cursorB, workArray, dest, lengthB);
            workArray[dest + lengthB] = tempArray[cursorTemp];
            return;
          }
          if (nofWinsA >= minGallop) break;
        }
      }

      // One run is winning so consistently that galloping may be a huge
      // win. So try that, and continue galloping until (if ever) neither
      // run appears to be winning consistently anymore.
      ++minGallop;
      let firstIteration = true;
      while (
        nofWinsA >= kMinGallopWins ||
        nofWinsB >= kMinGallopWins ||
        firstIteration
      ) {
        firstIteration = false;

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

        if (nofWinsA > 0) {
          Copy(tempArray, cursorTemp, workArray, dest, nofWinsA);
          dest = dest + nofWinsA;
          cursorTemp = cursorTemp + nofWinsA;
          lengthA = lengthA - nofWinsA;

          if (lengthA == 1) {
            //goto CopyB;
            Copy(workArray, cursorB, workArray, dest, lengthB);
            workArray[dest + lengthB] = tempArray[cursorTemp];
            return;
          }

          // lengthA == 0 is impossible now if the comparison function is
          // consistent, but we can't assume that it is.
          if (lengthA == 0) {
            //goto Succeed;
            if (lengthA > 0) {
              Copy(tempArray, cursorTemp, workArray, dest, lengthA);
            }
            return;
          }
        }
        workArray[dest++] = workArray[cursorB++];
        if (--lengthB == 0) {
          //goto Succeed;
          if (lengthA > 0) {
            Copy(tempArray, cursorTemp, workArray, dest, lengthA);
          }
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
        if (nofWinsB > 0) {
          Copy(workArray, cursorB, workArray, dest, nofWinsB);

          dest = dest + nofWinsB;
          cursorB = cursorB + nofWinsB;
          lengthB = lengthB - nofWinsB;

          if (lengthB == 0) {
            //goto Succeed;
            if (lengthA > 0) {
              Copy(tempArray, cursorTemp, workArray, dest, lengthA);
            }
            return;
          }
        }
        workArray[dest++] = tempArray[cursorTemp++];
        if (--lengthA == 1) {
          //goto CopyB;
          Copy(workArray, cursorB, workArray, dest, lengthB);
          workArray[dest + lengthB] = tempArray[cursorTemp];
          return;
        }
      }
      ++minGallop; // Penalize it for leaving galloping mode
      sortState.minGallop = minGallop;
    }
  } catch (err) {
    throw err;
  }

  // label Succeed {
  //   if (lengthA > 0) {
  //     Copy(tempArray, cursorTemp, workArray, dest, lengthA);
  //   }
  // }

  // label CopyB {
  //   dcheck(lengthA == 1 && lengthB > 0);
  //   // The last element of run A belongs at the end of the merge.
  //   Copy(workArray, cursorB, workArray, dest, lengthB);
  //   workArray[dest + lengthB] = tempArray[cursorTemp];
  // }
}

// Returns the temporary array and makes sure that it is big enough.
// TODO(szuend): Implement a better re-size strategy.
function GetTempArray(sortState, requestedSize) {
  const kSortStateTempSize = 32;
  const minSize = Math.max(kSortStateTempSize, requestedSize);

  const currentSize = sortState.tempArray.length;
  if (currentSize >= minSize) {
    return sortState.tempArray;
  }

  const tempArray = new Array(minSize);

  sortState.tempArray = tempArray;
  return tempArray;
}

function Copy(source, srcPos, target, dstPos, length) {
  // TODO(szuend): Investigate whether this builtin should be replaced
  //               by CopyElements/MoveElements for perfomance.

  // source and target might be the same array. To avoid overwriting
  // values in the case of overlaping ranges, elements are copied from
  // the back when srcPos < dstPos.
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
  return 1; //kSuccess;
}

// Merge the lengthA elements starting at baseA with the lengthB elements
// starting at baseB in a stable way, in-place. lengthA and lengthB must
// be > 0. Must also have that array[baseA + lengthA - 1] belongs at the
// end of the merge and should have lengthA >= lengthB.
function MergeHigh(sortState, baseA, lengthAArg, baseB, lengthBArg) {
  let lengthA = lengthAArg;
  let lengthB = lengthBArg;

  const workArray = sortState.workArray;
  const tempArray = GetTempArray(sortState, lengthB);
  Copy(workArray, baseB, tempArray, 0, lengthB);

  // MergeHigh merges the two runs backwards.
  let dest = baseB + lengthB - 1;
  let cursorTemp = lengthB - 1;
  let cursorA = baseA + lengthA - 1;

  workArray[dest--] = workArray[cursorA--];
  // let Succeed = -1
  try {
    if (--lengthA == 0) {
      //goto Succeed;
      if (lengthB > 0) {
        Copy(tempArray, 0, workArray, dest - (lengthB - 1), lengthB);
      }
      return;
    }
    if (lengthB == 1) {
      //  goto CopyA;
      // The first element of run B belongs at the front of the merge.
      dest = dest - lengthA;
      cursorA = cursorA - lengthA;
      Copy(workArray, cursorA + 1, workArray, dest + 1, lengthA);
      workArray[dest] = tempArray[cursorTemp];
      return;
    }

    let minGallop = sortState.minGallop;
    // TODO(szuend): Replace with something that does not have a runtime
    //               overhead as soon as its available in Torque.
    while (1) {
      let nofWinsA = 0; // # of times A won in a row.
      let nofWinsB = 0; // # of times B won in a row.

      // Do the straightforward thing until (if ever) one run appears to
      // win consistently.
      // TODO(szuend): Replace with something that does not have a runtime
      //               overhead as soon as its available in Torque.
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

          if (lengthA == 0) {
            //goto Succeed;
            if (lengthB > 0) {
              Copy(tempArray, 0, workArray, dest - (lengthB - 1), lengthB);
            }
            return;
          }
          if (nofWinsA >= minGallop) break;
        } else {
          workArray[dest--] = tempArray[cursorTemp--];

          ++nofWinsB;
          --lengthB;
          nofWinsA = 0;

          if (lengthB == 1) {
            //  goto CopyA;
            // The first element of run B belongs at the front of the merge.
            dest = dest - lengthA;
            cursorA = cursorA - lengthA;
            Copy(workArray, cursorA + 1, workArray, dest + 1, lengthA);
            workArray[dest] = tempArray[cursorTemp];
            return;
          }
          if (nofWinsB >= minGallop) break;
        }
      }

      // One run is winning so consistently that galloping may be a huge
      // win. So try that, and continue galloping until (if ever) neither
      // run appears to be winning consistently anymore.
      ++minGallop;
      let firstIteration = true;
      while (
        nofWinsA >= kMinGallopWins ||
        nofWinsB >= kMinGallopWins ||
        firstIteration
      ) {
        firstIteration = false;

        minGallop = Math.max(1, minGallop - 1);
        sortState.minGallop = minGallop;

        let k = GallopRight(
          sortState,
          workArray,
          tempArray[cursorTemp],
          baseA,
          lengthA,
          lengthA - 1
        );
        nofWinsA = lengthA - k;

        if (nofWinsA > 0) {
          dest = dest - nofWinsA;
          cursorA = cursorA - nofWinsA;
          Copy(workArray, cursorA + 1, workArray, dest + 1, nofWinsA);

          lengthA = lengthA - nofWinsA;
          if (lengthA == 0) {
            //goto Succeed;
            if (lengthB > 0) {
              Copy(tempArray, 0, workArray, dest - (lengthB - 1), lengthB);
            }
            return;
          }
        }
        workArray[dest--] = tempArray[cursorTemp--];
        if (--lengthB == 1) {
          //  goto CopyA;
          // The first element of run B belongs at the front of the merge.
          dest = dest - lengthA;
          cursorA = cursorA - lengthA;
          Copy(workArray, cursorA + 1, workArray, dest + 1, lengthA);
          workArray[dest] = tempArray[cursorTemp];
          return;
        }

        k = GallopLeft(
          sortState,
          tempArray,
          workArray[cursorA],
          0,
          lengthB,
          lengthB - 1
        );
        nofWinsB = lengthB - k;

        if (nofWinsB > 0) {
          dest = dest - nofWinsB;
          cursorTemp = cursorTemp - nofWinsB;
          Copy(tempArray, cursorTemp + 1, workArray, dest + 1, nofWinsB);

          lengthB = lengthB - nofWinsB;
          if (lengthB == 1) {
            //  goto CopyA;
            // The first element of run B belongs at the front of the merge.
            dest = dest - lengthA;
            cursorA = cursorA - lengthA;
            Copy(workArray, cursorA + 1, workArray, dest + 1, lengthA);
            workArray[dest] = tempArray[cursorTemp];
            return;
          }

          // lengthB == 0 is impossible now if the comparison function is
          // consistent, but we can't assume that it is.
          if (lengthB == 0) {
            //goto Succeed;
            if (lengthB > 0) {
              Copy(tempArray, 0, workArray, dest - (lengthB - 1), lengthB);
            }
            return;
          }
        }
        workArray[dest--] = workArray[cursorA--];
        if (--lengthA == 0) {
          //goto Succeed;
          if (lengthB > 0) {
            Copy(tempArray, 0, workArray, dest - (lengthB - 1), lengthB);
          }
          return;
        }
      }
      ++minGallop;
      sortState.minGallop = minGallop;
    }
  } catch (err) {
    throw err;
  }

  // label Succeed {
  //   if (lengthB > 0) {
  //     dcheck(lengthA == 0);
  //     Copy(tempArray, 0, workArray, dest - (lengthB - 1), lengthB);
  //   }
  // }

  // label CopyA {
  //   dcheck(lengthB == 1 && lengthA > 0);

  //   // The first element of run B belongs at the front of the merge.
  //   dest = dest - lengthA;
  //   cursorA = cursorA - lengthA;
  //   Copy(workArray, cursorA + 1, workArray, dest + 1, lengthA);
  //   workArray[dest] = tempArray[cursorTemp];
  // }
}
