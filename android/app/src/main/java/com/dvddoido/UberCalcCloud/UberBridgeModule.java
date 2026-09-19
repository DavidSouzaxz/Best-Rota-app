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
    private static boolean servicoLigado = true; // Controla se o pop-up de corridas está ativo

    public static void enviarDados(String dados) {
        // Se o usuário desligou a função pelo ícone, ignora as corridas
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

    // Exibe a bolha redonda flutuante na tela
    @ReactMethod
    public void mostrarBolha() {
        UiThreadUtil.runOnUiThread(new Runnable() {
            @Override
            public void run() {
                if (floatingBubble != null) return; // Se já existe, não cria outra

                windowManager = (WindowManager) reactContext.getSystemService(Context.WINDOW_SERVICE);
                floatingBubble = new LinearLayout(reactContext);
                
                // Estilo da Bolha Redonda
                GradientDrawable bgBolha = new GradientDrawable();
                bgBolha.setShape(GradientDrawable.OVAL);
                bgBolha.setColor(Color.parseColor("#00875f")); // Cor verde do app
                floatingBubble.setBackground(bgBolha);
                floatingBubble.setGravity(Gravity.CENTER);

                // Texto ou Ícone dentro da bolha ("PRO")
                TextView txtBolha = new TextView(reactContext);
                txtBolha.setText("PRO");
                txtBolha.setTextColor(Color.WHITE);
                txtBolha.setTextSize(14f);
                txtBolha.setTypeface(null, Typeface.BOLD);
                floatingBubble.addView(txtBolha);

                int layoutFlag = Build.VERSION.SDK_INT >= Build.VERSION_CODES.O 
                    ? WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY 
                    : WindowManager.LayoutParams.TYPE_PHONE;

                WindowManager.LayoutParams params = new WindowManager.LayoutParams(
                        120, 120, // Largura e altura em pixels (bolha redonda)
                        layoutFlag,
                        WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE,
                        PixelFormat.TRANSLUCENT);

                params.gravity = Gravity.TOP | Gravity.START;
                params.x = 50;
                params.y = 300;

                // Adiciona evento de clique na bolha para avisar o React Native
                floatingBubble.setOnClickListener(new View.OnClickListener() {
                    @Override
                    public void onClick(View v) {
                        try {
                            android.content.Intent intent = reactContext.getPackageManager()
                                    .getLaunchIntentForPackage(reactContext.getPackageName());
                            if (intent != null) {
                                intent.addFlags(android.content.Intent.FLAG_ACTIVITY_NEW_TASK);
                                reactContext.startActivity(intent);
                            }
                        } catch (Exception e) {
                            e.printStackTrace();
                        }
                    }
                });

                // Torna a bolha arrastável na tela
                floatingBubble.setOnTouchListener(new View.OnTouchListener() {
                    private int initialX;
                    private int initialY;
                    private float initialTouchX;
                    private float initialTouchY;

                    @Override
                    public boolean onTouch(View v, MotionEvent event) {
                        switch (event.getAction()) {
                            case MotionEvent.ACTION_DOWN:
                                initialX = params.x;
                                initialY = params.y;
                                initialTouchX = event.getRawX();
                                initialTouchY = event.getRawY();
                                return true;
                            case MotionEvent.ACTION_MOVE:
                                params.x = initialX + (int) (event.getRawX() - initialTouchX);
                                params.y = initialY + (int) (event.getRawY() - initialTouchY);
                                windowManager.updateViewLayout(floatingBubble, params);
                                return true;
                        }
                        return false;
                    }
                });

                windowManager.addView(floatingBubble, params);
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
    public void alternarStatusServico(boolean ligado) {
        servicoLigado = ligado;
        if (!ligado) {
            esconderPopupNativo();
        }
    }

    @ReactMethod
    public void mostrarPopup(String tempoKm, String rsKm, String rsHora, String lucroPct, String corHex) {
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
                floatingView.setPadding(30, 25, 30, 25);

                GradientDrawable bgPrincipal = new GradientDrawable();
                bgPrincipal.setColor(Color.parseColor("#0D1117"));
                bgPrincipal.setCornerRadius(25f);
                bgPrincipal.setStroke(5, corStatus);
                floatingView.setBackground(bgPrincipal);

                TextView txtTempoKm = new TextView(reactContext);
                txtTempoKm.setText(tempoKm);
                txtTempoKm.setTextColor(Color.WHITE);
                txtTempoKm.setTextSize(18f);
                txtTempoKm.setTypeface(null, Typeface.BOLD);
                txtTempoKm.setPadding(0, 0, 0, 15);
                floatingView.addView(txtTempoKm);

                LinearLayout divisor = new LinearLayout(reactContext);
                divisor.setBackgroundColor(Color.parseColor("#30363D"));
                divisor.setLayoutParams(new LinearLayout.LayoutParams(LinearLayout.LayoutParams.MATCH_PARENT, 2));
                floatingView.addView(divisor);

                LinearLayout colunasLayout = new LinearLayout(reactContext);
                colunasLayout.setOrientation(LinearLayout.HORIZONTAL);
                colunasLayout.setPadding(0, 15, 0, 0);

                colunasLayout.addView(criarColuna("R$/km", rsKm, corStatus));
                colunasLayout.addView(criarColuna("R$/Hora", rsHora, corStatus));
                colunasLayout.addView(criarColuna("Lucro (%)", lucroPct, corStatus));

                floatingView.addView(colunasLayout);

                int layoutFlag = Build.VERSION.SDK_INT >= Build.VERSION_CODES.O 
                    ? WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY 
                    : WindowManager.LayoutParams.TYPE_PHONE;

                WindowManager.LayoutParams params = new WindowManager.LayoutParams(
                        WindowManager.LayoutParams.MATCH_PARENT,
                        WindowManager.LayoutParams.WRAP_CONTENT,
                        layoutFlag,
                        WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE,
                        PixelFormat.TRANSLUCENT);

                params.gravity = Gravity.TOP | Gravity.CENTER_HORIZONTAL;
                params.x = 0;
                params.y = 120;

                windowManager.addView(floatingView, params);
            }
        });
    }

    @ReactMethod
    public void esconderPopup() {
        esconderPopupNativo();
    }

    private LinearLayout criarColuna(String titulo, String valor, int corBarra) {
        LinearLayout coluna = new LinearLayout(reactContext);
        coluna.setOrientation(LinearLayout.VERTICAL);
        coluna.setLayoutParams(new LinearLayout.LayoutParams(0, LinearLayout.LayoutParams.WRAP_CONTENT, 1.0f));

        TextView lblTitulo = new TextView(reactContext);
        lblTitulo.setText(titulo);
        lblTitulo.setTextColor(Color.parseColor("#8B949E"));
        lblTitulo.setTextSize(12f);
        coluna.addView(lblTitulo);

        LinearLayout valorComBarra = new LinearLayout(reactContext);
        valorComBarra.setOrientation(LinearLayout.HORIZONTAL);
        valorComBarra.setGravity(Gravity.CENTER_VERTICAL);
        valorComBarra.setPadding(0, 4, 0, 0);

        LinearLayout barra = new LinearLayout(reactContext);
        barra.setBackgroundColor(corBarra);
        LinearLayout.LayoutParams barraParams = new LinearLayout.LayoutParams(6, 36);
        barraParams.setMargins(0, 0, 8, 0);
        barra.setLayoutParams(barraParams);
        valorComBarra.addView(barra);

        TextView lblValor = new TextView(reactContext);
        lblValor.setText(valor);
        lblValor.setTextColor(Color.WHITE);
        lblValor.setTextSize(20f);
        lblValor.setTypeface(null, Typeface.BOLD);
        valorComBarra.addView(lblValor);

        coluna.addView(valorComBarra);
        return coluna;
    }
}