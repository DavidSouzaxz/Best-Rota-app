package com.dvddoido.UberCalcCloud;

import android.graphics.Color;
import android.graphics.PixelFormat;
import android.graphics.Typeface;
import android.os.Build;
import android.view.Gravity;
import android.view.WindowManager;
import android.widget.LinearLayout;
import android.widget.TextView;
import android.content.Context;

import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;
import com.facebook.react.bridge.UiThreadUtil;
import com.facebook.react.modules.core.DeviceEventManagerModule;

public class UberBridgeModule extends ReactContextBaseJavaModule {
    private static ReactApplicationContext reactContext;
    public static void enviarDados(String dados) {
        if (reactContext != null) {
            reactContext.getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter.class)
                    .emit("CorridaDetectada", dados);
        }
    }
    private WindowManager windowManager;

    private LinearLayout floatingView;

    UberBridgeModule(ReactApplicationContext context) {
        super(context);
        reactContext = context;
    }

    @Override
    public String getName() {
        return "UberBridge";
    }

    @ReactMethod
    public void mostrarPopup(String textoExibicao, String corHex) {
        UiThreadUtil.runOnUiThread(new Runnable() {
            @Override
            public void run() {
                if (floatingView != null) {
                    windowManager.removeView(floatingView);
                    floatingView = null;
                }

                windowManager = (WindowManager) reactContext.getSystemService(Context.WINDOW_SERVICE);
                floatingView = new LinearLayout(reactContext);
                floatingView.setOrientation(LinearLayout.VERTICAL);
                floatingView.setBackgroundColor(Color.parseColor(corHex));
                floatingView.setPadding(40, 40, 40, 40);

                TextView texto = new TextView(reactContext);
                texto.setText(textoExibicao);
                texto.setTextColor(Color.WHITE);
                texto.setTextSize(22f);
                texto.setTypeface(null, Typeface.BOLD);
                floatingView.addView(texto);

                int layoutFlag = Build.VERSION.SDK_INT >= Build.VERSION_CODES.O 
                    ? WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY 
                    : WindowManager.LayoutParams.TYPE_PHONE;

                WindowManager.LayoutParams params = new WindowManager.LayoutParams(
                        WindowManager.LayoutParams.WRAP_CONTENT,
                        WindowManager.LayoutParams.WRAP_CONTENT,
                        layoutFlag,
                        WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE,
                        PixelFormat.TRANSLUCENT);

                params.gravity = Gravity.TOP | Gravity.CENTER_HORIZONTAL;
                params.y = 150; 

                windowManager.addView(floatingView, params);
            }
        });
    }

    @ReactMethod
    public void esconderPopup() {
        UiThreadUtil.runOnUiThread(new Runnable() {
            @Override
            public void run() {
                if (floatingView != null && windowManager != null) {
                    windowManager.removeView(floatingView);
                    floatingView = null;
                }
            }
        });
    }
}