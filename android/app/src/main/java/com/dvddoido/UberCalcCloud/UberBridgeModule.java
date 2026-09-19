package com.dvddoido.UberCalcCloud;

import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.modules.core.DeviceEventManagerModule;

public class UberBridgeModule extends ReactContextBaseJavaModule {
    private static ReactApplicationContext reactContext;

    UberBridgeModule(ReactApplicationContext context) {
        super(context);
        reactContext = context;
    }

    @Override
    public String getName() {
        return "UberBridge";
    }

    // Função que o Serviço chamará para jogar o texto no React Native
    public static void enviarDados(String dados) {
        if (reactContext != null) {
            reactContext.getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter.class)
                    .emit("CorridaDetectada", dados);
        }
    }
}