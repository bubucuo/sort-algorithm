describe("数组Diff", () => {
  const {TimSort} = require("../index");
  const sort = TimSort;
  it("整数12345", () => {
    const arr = [5, 1, 2, 4, 3];

    const compare = (a, b) => a - b;

    const res = sort(arr, compare);
    expect(res).toBe(arr.sort());
  });

  it("整数64", () => {
    const arr = [];

    for (let i = 0; i < 64; i++) {
      arr[i] = (Math.random() * 1000) >> 1;
    }

    const compare = (a, b) => a - b;

    const res = sort(arr, compare);
    expect(res).toBe(arr.sort());
  });
  it("整数164", () => {
    const arr = [];

    for (let i = 0; i < 164; i++) {
      arr[i] = (Math.random() * 1000) >> 1;
    }

    const compare = (a, b) => a - b;

    const res = sort(arr, compare);
    expect(res).toBe(arr.sort());
  });

  it("小数164", () => {
    const arr = [];

    for (let i = 0; i < 164; i++) {
      arr[i] = Math.random() * 1000;
    }

    const compare = (a, b) => a - b;

    const res = sort(arr, compare);
    expect(res).toBe(arr.sort());
  });
});
