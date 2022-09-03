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
        sort,
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

function CountAndMakeRun() {}

function ComputeMinRunLength() {}

function BinaryInsertionSort() {}

function PushRun() {}

function MergeCollapse() {}
