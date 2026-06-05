import { afterEach, describe, expect, it, vi } from "vitest";

const mockNativeModules = vi.hoisted(() => ({
  SourceCode: {
    scriptURL: undefined as string | undefined,
  },
}));

vi.mock("react-native", () => ({
  NativeModules: mockNativeModules,
}));

async function loadApiBaseUrl() {
  vi.resetModules();
  const module = await import("./env");
  return module.API_BASE_URL;
}

describe("API_BASE_URL", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
    mockNativeModules.SourceCode.scriptURL = undefined;
  });

  it("usa EXPO_PUBLIC_API_URL cuando esta definido", async () => {
    vi.stubEnv("EXPO_PUBLIC_API_URL", "http://10.0.0.5:8000/api/v1/");
    vi.stubGlobal("__DEV__", true);
    mockNativeModules.SourceCode.scriptURL = "http://192.168.1.10:8081/index.bundle";

    await expect(loadApiBaseUrl()).resolves.toBe("http://10.0.0.5:8000/api/v1");
  });

  it("deriva la URL del backend desde la IP LAN de Metro en desarrollo", async () => {
    vi.stubGlobal("__DEV__", true);
    mockNativeModules.SourceCode.scriptURL = "http://10.87.184.253:8081/index.bundle?platform=android";

    await expect(loadApiBaseUrl()).resolves.toBe("http://10.87.184.253:8000/api/v1");
  });

  it("usa localhost cuando Metro no expone una IP LAN", async () => {
    vi.stubGlobal("__DEV__", true);
    mockNativeModules.SourceCode.scriptURL = "http://localhost:8081/index.bundle";

    await expect(loadApiBaseUrl()).resolves.toBe("http://localhost:8000/api/v1");
  });
});
