window.postMessage = (message: any, targetOrigin: any) => {
  let data: any = {
    jsonrpc: "2.0",
    result: "bar",
    id: 0,
  };
  if (message.id === 1) {
    data = {
      jsonrpc: "2.0",
      error: {
        code: 32009,
        message: "Error message",
      },
      id: 1,
    }
  }
  if (message.id === 2) {
    data = {
      jsonrpc: "2.0",
      error: {
        code: 32009,
        message: "Random Segfault that crashes fetch",
      },
      id: 2,
    }
  }

  const event = new window.MessageEvent("message", {
    data,
  });
  event.initEvent("message", true, false);
  setTimeout(() => {
    window.dispatchEvent(event);
  }, 0);
};

import PostMessageTransport from "./PostMessageTransport";
import { generateMockRequest } from "../__mocks__/requestData";

window.open = () => {
  return window;
}

describe("PostMessageTransport", () => {

  describe("window", () => {
    it("can connect", () => {
      const pmt = new PostMessageTransport("http://localhost:8545", "window");
      return pmt.connect();
    });

    it("can error connect with bad uri", () => {
      const pmt = new PostMessageTransport("foo://localhost:8545", "window");
      expect(pmt.connect()).rejects.toThrowError("Bad URI");
    });

    it("can close", () => {
      const pmt = new PostMessageTransport("http://localhost:8545", "window");
      pmt.close();
    });

    it("can send and receive data", async () => {
      const pmt = new PostMessageTransport("http://localhost:8545/rpc-request", "window");
      await pmt.connect();
      const result = await pmt.sendData({
        request: generateMockRequest(0, "foo", ["bar"]),
        internalID: 0
      });
      expect(result).toEqual("bar");
      await new Promise((resolve) => setTimeout(resolve, 100));
    });

    it("can send and receive data against potential timeout", async () => {
      const pmt = new PostMessageTransport("http://localhost:8545/rpc-request", "window");
      await pmt.connect();
      const result = await pmt.sendData({
        request: generateMockRequest(0, "foo", ["bar"]),
        internalID: 0
      }, 10000);
      expect(result).toEqual("bar");
      await new Promise((resolve) => setTimeout(resolve, 100));
    });

    it("can send and receive errors", async () => {
      const pmt = new PostMessageTransport("http://localhost:8545/rpc-error", "window");
      await pmt.connect();
      await expect(pmt.sendData({
        request: generateMockRequest(1, "foo", ["bar"]),
        internalID: 1,
      })).rejects.toThrowError("Error message");
      await new Promise((resolve) => setTimeout(resolve, 100));
    });

    it("can handle underlying transport crash", async () => {
      const pmt = new PostMessageTransport("http://localhost:8545/crash", "window");
      await pmt.connect();
      await expect(pmt.sendData({
        request: generateMockRequest(2, "foo", ["bar"]),
        internalID: 2,
      })).rejects.toThrowError("Random Segfault that crashes fetch");
      await new Promise((resolve) => setTimeout(resolve, 100));
    });

  })

  describe("iframe", () => {
    it("can connect", () => {
      const pmt = new PostMessageTransport("http://localhost:8545", "iframe");
      return pmt.connect();
    });

    it("can close", () => {
      const pmt = new PostMessageTransport("http://localhost:8545", "iframe");
      pmt.close();
    });
  });

});
