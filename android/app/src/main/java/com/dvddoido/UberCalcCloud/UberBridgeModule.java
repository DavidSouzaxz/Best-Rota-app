package com.dvddoido.UberCalcCloud;

import android.graphics.Color;
import android.graphics.PixelFormat;
import android.graphics.Typeface;
import android.graphics.drawable.GradientDrawable;
import android.os.Build;
import android.view.Gravity;
import android.view.MotionEvent;
import android.view.View;
import android.view.WindowManager;
import android.widget.LinearLayout;
import android.widget.TextView;
import android.content.Context;
import android.net.Uri;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;
import com.facebook.react.bridge.UiThreadUtil;
import com.facebook.react.modules.core.DeviceEventManagerModule;

public class UberBridgeModule extends ReactContextBaseJavaModule {
    private static ReactApplicationContext reactContext;
    private static WindowManager windowManager;
    private static LinearLayout floatingView;
    private static LinearLayout floatingBubble;
    private static boolean servicoLigado = true;

    public static void enviarDados(String dados) {
        if (!servicoLigado) return;
        if (reactContext != null) {
            reactContext.getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter.class)
                    .emit("CorridaDetectada", dados);
        }
    }

    public static void esconderPopupNativo() {
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

    UberBridgeModule(ReactApplicationContext context) {
        super(context);
        reactContext = context;
    }

    @Override
    public String getName() {
        return "UberBridge";
    }

    
    @ReactMethod
    public void mostrarBolha() {
        if (!servicoLigado) return;

        UiThreadUtil.runOnUiThread(new Runnable() {
            @Override
            public void run() {
                if (bolhaView != null) return; 

                windowManager = (WindowManager) reactContext.getSystemService(Context.WINDOW_SERVICE);
                bolhaView = new FrameLayout(reactContext);

                
                android.widget.ImageView iconeApp = new android.widget.ImageView(reactContext);
                int iconeResId = reactContext.getResources().getIdentifier("ic_launcher", "mipmap", reactContext.getPackageName());
                
                if (iconeResId != 0) {
                    iconeApp.setImageResource(iconeResId);
                }

                
                FrameLayout.LayoutParams imgParams = new FrameLayout.LayoutParams(130, 130);
                imgParams.gravity = Gravity.CENTER;
                iconeApp.setLayoutParams(imgParams);

                
                GradientDrawable fundo = new GradientDrawable();
                fundo.setShape(GradientDrawable.OVAL);
                fundo.setColor(Color.parseColor("#121214")); 
                fundo.setStroke(4, Color.parseColor("#00e676")); 
                bolhaView.setBackground(fundo);
                bolhaView.setElevation(15f);

                bolhaView.addView(iconeApp);

                int layoutFlag = Build.VERSION.SDK_INT >= Build.VERSION_CODES.O 
                    ? WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY 
                    : WindowManager.LayoutParams.TYPE_PHONE;

                WindowManager.LayoutParams params = new WindowManager.LayoutParams(
                        140, // Largura
                        140, // Altura
                        layoutFlag,
                        WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE,
                        PixelFormat.TRANSLUCENT);

                params.gravity = Gravity.TOP | Gravity.LEFT;
                params.x = 20;
                params.y = 200;

                final int[] initialX = new int[1];
                final int[] initialY = new int[1];
                final float[] initialTouchX = new float[1];
                final float[] initialTouchY = new float[1];
                final boolean[] isClick = new boolean[1];

                bolhaView.setOnTouchListener(new View.OnTouchListener() {
                    @Override
                    public boolean onTouch(View v, MotionEvent event) {
                        switch (event.getAction()) {
                            case MotionEvent.ACTION_DOWN:
                                initialX[0] = params.x;
                                initialY[0] = params.y;
                                initialTouchX[0] = event.getRawX();
                                initialTouchY[0] = event.getRawY();
                                isClick[0] = true;
                                return true;
                            case MotionEvent.ACTION_MOVE:
                                if (Math.abs(event.getRawX() - initialTouchX[0]) > 10 || Math.abs(event.getRawY() - initialTouchY[0]) > 10) {
                                    isClick[0] = false; 
                                }
                                params.x = initialX[0] + (int) (event.getRawX() - initialTouchX[0]);
                                params.y = initialY[0] + (int) (event.getRawY() - initialTouchY[0]);
                                windowManager.updateViewLayout(bolhaView, params);
                                return true;
                            case MotionEvent.ACTION_UP:
                                if (isClick[0]) {
                                    
                                    android.content.Intent intent = reactContext.getPackageManager().getLaunchIntentForPackage(reactContext.getPackageName());
                                    if (intent != null) {
                                        intent.addFlags(android.content.Intent.FLAG_ACTIVITY_NEW_TASK);
                                        reactContext.startActivity(intent);
                                    }
                                }
                                return true;
                        }
                        return false;
                    }
                });

                windowManager.addView(bolhaView, params);
            }
        });
    }

    @ReactMethod
    public void esconderBolha() {
        UiThreadUtil.runOnUiThread(new Runnable() {
            @Override
            public void run() {
                if (floatingBubble != null && windowManager != null) {
                    windowManager.removeView(floatingBubble);
                    floatingBubble = null;
                }
            }
        });
    }

    @ReactMethod
    public void abrirAppUberDriver() {
        String packageName = "com.ubercab.driver";
        try {
            android.content.Intent intent = reactContext.getPackageManager().getLaunchIntentForPackage(packageName);
            if (intent != null) {
                intent.addFlags(android.content.Intent.FLAG_ACTIVITY_NEW_TASK);
                reactContext.startActivity(intent);
            } else {
               
                android.content.Intent webIntent = new android.content.Intent(
                        android.content.Intent.ACTION_VIEW, 
                        Uri.parse("https://play.google.com/store/apps/details?id=" + packageName));
                webIntent.addFlags(android.content.Intent.FLAG_ACTIVITY_NEW_TASK);
                reactContext.startActivity(webIntent);
            }
        } catch (Exception e) {
            e.printStackTrace();
        }
    }

    @ReactMethod
    public void alternarStatusServico(boolean ligado) {
        servicoLigado = ligado;
        if (!ligado) {
            esconderPopupNativo();
        }
    }

    
    @ReactMethod
    public void mostrarPopup(String tempoKm, String lucroLiq, String rsHora, String lucroPct, String corHex) {
        if (!servicoLigado) return;

        UiThreadUtil.runOnUiThread(new Runnable() {
            @Override
            public void run() {
                if (floatingView != null && windowManager != null) {
                    windowManager.removeView(floatingView);
                    floatingView = null;
                }

                windowManager = (WindowManager) reactContext.getSystemService(Context.WINDOW_SERVICE);
                int corStatus = Color.parseColor(corHex);

                floatingView = new LinearLayout(reactContext);
                floatingView.setOrientation(LinearLayout.VERTICAL);
                floatingView.setPadding(25, 15, 25, 15); // Pop-up mais fino

                GradientDrawable bgPrincipal = new GradientDrawable();
                bgPrincipal.setColor(Color.parseColor("#0D1117"));
                bgPrincipal.setCornerRadius(20f);
                bgPrincipal.setStroke(4, corStatus);
                floatingView.setBackground(bgPrincipal);

                TextView txtTempoKm = new TextView(reactContext);
                txtTempoKm.setText(tempoKm);
                txtTempoKm.setTextColor(Color.WHITE);
                txtTempoKm.setTextSize(16f); // Fonte do título reduzida
                txtTempoKm.setTypeface(null, Typeface.BOLD);
                txtTempoKm.setPadding(0, 0, 0, 10);
                txtTempoKm.setGravity(Gravity.CENTER);
                floatingView.addView(txtTempoKm);

                LinearLayout divisor = new LinearLayout(reactContext);
                divisor.setBackgroundColor(Color.parseColor("#30363D"));
                divisor.setLayoutParams(new LinearLayout.LayoutParams(LinearLayout.LayoutParams.MATCH_PARENT, 2));
                floatingView.addView(divisor);

                LinearLayout colunasLayout = new LinearLayout(reactContext);
                colunasLayout.setOrientation(LinearLayout.HORIZONTAL);
                colunasLayout.setPadding(0, 10, 0, 0);

                
                colunasLayout.addView(criarColuna("Líquido", lucroLiq, corStatus));
                colunasLayout.addView(criarColuna("R$/Hora", rsHora, corStatus));
                colunasLayout.addView(criarColuna("Lucro (%)", lucroPct, corStatus));

                floatingView.addView(colunasLayout);

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
                params.x = 0;
                params.y = 120;

                final int[] initialX = new int[1];
                final int[] initialY = new int[1];
                final float[] initialTouchX = new float[1];
                final float[] initialTouchY = new float[1];

                floatingView.setOnTouchListener(new View.OnTouchListener() {
                    @Override
                    public boolean onTouch(View v, MotionEvent event) {
                        switch (event.getAction()) {
                            case MotionEvent.ACTION_DOWN:
                                initialX[0] = params.x;
                                initialY[0] = params.y;
                                initialTouchX[0] = event.getRawX();
                                initialTouchY[0] = event.getRawY();
                                return true;
                            case MotionEvent.ACTION_MOVE:
                                params.x = initialX[0] + (int) (event.getRawX() - initialTouchX[0]);
                                params.y = initialY[0] + (int) (event.getRawY() - initialTouchY[0]);
                                windowManager.updateViewLayout(floatingView, params);
                                return true;
                        }
                        return false;
                    }
                });

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

    private LinearLayout criarColuna(String titulo, String valor, int corBarra) {
        LinearLayout coluna = new LinearLayout(reactContext);
        coluna.setOrientation(LinearLayout.VERTICAL);
        
        LinearLayout.LayoutParams colParams = new LinearLayout.LayoutParams(LinearLayout.LayoutParams.WRAP_CONTENT, LinearLayout.LayoutParams.WRAP_CONTENT);
        colParams.setMargins(10, 0, 10, 0); 
        coluna.setLayoutParams(colParams);

        TextView lblTitulo = new TextView(reactContext);
        lblTitulo.setText(titulo);
        lblTitulo.setTextColor(Color.parseColor("#8B949E"));
        lblTitulo.setTextSize(11f); 
        coluna.addView(lblTitulo);

        LinearLayout valorComBarra = new LinearLayout(reactContext);
        valorComBarra.setOrientation(LinearLayout.HORIZONTAL);
        valorComBarra.setGravity(Gravity.CENTER_VERTICAL);
        valorComBarra.setPadding(0, 4, 0, 0);

        LinearLayout barra = new LinearLayout(reactContext);
        barra.setBackgroundColor(corBarra);
        LinearLayout.LayoutParams barraParams = new LinearLayout.LayoutParams(6, 30);
        barraParams.setMargins(0, 0, 6, 0);
        barra.setLayoutParams(barraParams);
        valorComBarra.addView(barra);

        TextView lblValor = new TextView(reactContext);
        lblValor.setText(valor);
        lblValor.setTextColor(Color.WHITE);
        lblValor.setTextSize(15f);
        lblValor.setTypeface(null, Typeface.BOLD);
        valorComBarra.addView(lblValor);

        coluna.addView(valorComBarra);
        return coluna;
    }
}