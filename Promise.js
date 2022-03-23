class MyPromise {
  constructor(execator) {
    this.init();
    try {
      execator(this.resolve.bind(this), this.reject.bind(this));
    } catch (err) {
      this.reject(err);
    }
  }
  init() {
    this.status = "pending";
    this.result = null;
    this.resolveArr = [];
    this.rejectArr = [];
  }
  resolve(value) {
    if (this.status !== "pending") return;
    this.status = "fulfilled";
    this.result = value;
    while (this.resolveArr.length) {
      this.resolveArr.shift()(this.result);
    }
  }
  reject(value) {
    if (this.status !== "pending") return;
    this.status = "rejected";
    this.result = value;
    while (this.rejectArr.length) {
      let func = this.rejectArr.shift();
      func(this.result);
    }
  }
  then(onFulfilled, onRejected) {
    // 首先初始化成功函数和失败函数
    onFulfilled = onFulfilled || ((value) => value);
    onRejected =
      onRejected ||
      ((err) => {
        throw err;
      });
    // 建立一个返回Promise
    let thenPromise = new MyPromise((resolve, reject) => {
      let handlePromise = (cb) => {
        // 建立一个微任务
        queueMicrotask(() => {
          try {
            // 执行回调
            let result = cb(this.result);
            if (result === thenPromise) {
              throw new Error("返回的值不能为原Promise");
            } else if (result instanceof MyPromise) {
              // 此处只是将resolve，reject交给返回的Promise执行，但并不返回此Promise（result）
              result.then(resolve, reject);
            } else {
              // 如果没有问题的话，则当做成功
              resolve(result);
            }
          } catch (e) {
            // 报错则reject
            reject(e);
          }
        });
      };
      // 如果执行完execator后已经有状态，则可以执行回调，否则将此回调加入到队列中，等待执行
      if (this.status === "fulfilled") {
        handlePromise(onFulfilled);
      } else if (this.status === "rejected") {
        handlePromise(onRejected);
      } else if (this.status === "pending") {
        this.resolveArr.push(handlePromise.bind(this, onFulfilled));
        this.rejectArr.push(handlePromise.bind(this, onRejected));
      }
    });
    return thenPromise;
  }
  catch(handle) {
    return this.then(null, handle);
  }
  finally(handle) {
    return this.then(handle, handle)
  }
  static all(arr) {
    return new MyPromise((resolve, reject) => {
      let length = arr.length;
      let doneNum = 0;
      const result = [];
      arr.map((item, index) => {
        if (item instanceof MyPromise) {
          item.then((res) => {
            doneNum++;
            result[index] = res;
            if (doneNum == length) {
              resolve(result);
            }
              
          }, (err) => {reject(err)});
        } else {
          doneNum++;
          result[index] = item;
        }
      });
    });
  }
  static race(arr) {
    return new MyPromise((resolve, reject) => {
      arr.map(item => {
        item.then((res) => {
          resolve(res);
        }, (err) => reject(err))
      })
    })
  }
}