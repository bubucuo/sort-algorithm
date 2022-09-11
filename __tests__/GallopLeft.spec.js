describe("GallopLeft", () => {
  const {GallopLeft} = require("../timSort");

  const compare = (a, b) => a - b;

  it("GallopLeft 31", () => {
    const arr = [];

    for (let i = 0; i < 64; i++) {
      arr[i] = i % 32;
    }

    const res = GallopLeft({workArray: arr, Compare: compare}, 31, 32, 32, 31);

    // console.log(
    //   "%c [  ]-14",
    //   "font-size:13px; background:pink; color:#bf2c9f;",
    //   arr
    // );

    expect(res).toBe(31);
  });

  it("GallopLeft 32", () => {
    const arr = [];

    for (let i = 0; i < 64; i++) {
      arr[i] = i % 32;
    }

    arr[63] = 30;

    // console.log(
    //   "%c [  ]-15",
    //   "font-size:13px; background:pink; color:#bf2c9f;",
    //   arr
    // );

    const res = GallopLeft({workArray: arr, Compare: compare}, 31, 32, 32, 31);
    expect(res).toBe(32);
  });
});
