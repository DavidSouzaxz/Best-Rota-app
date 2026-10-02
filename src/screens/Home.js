import AsyncStorage from "@react-native-async-storage/async-storage";
import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  AppState,
  Modal,
  NativeEventEmitter,
  NativeModules,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

export default function Home() {
  const [statusAutenticacao, setStatusAutenticacao] = useState("carregando");
  const [tokenInput, setTokenInput] = useState("");
  const [erroToken, setErroToken] = useState("");
  const TOKEN_MESTRE = "UBERPRO2026";

  const [appAtivo, setAppAtivo] = useState(true);
  const [historico, setHistorico] = useState([]);
  const [autonomiaRestante, setAutonomiaRestante] = useState("");

  const [modalConfig, setModalConfig] = useState(false);
  const [modalConfigGeral, setModalConfigGeral] = useState(false);
  const [modalPermissoes, setModalPermissoes] = useState(false);

  const [bolhaHabilitada, setBolhaHabilitada] = useState(true);
  const [gasolina, setGasolina] = useState({ preco: "5.80", consumo: "12.5" });
  const [etanol, setEtanol] = useState({ preco: "3.90", consumo: "8.5" });
  const [tanqueAtual, setTanqueAtual] = useState("Gasolina");

  const configCarro = useRef({ preco: 5.8, consumo: 12.5 });
  const corridaPendente = useRef(null);

  useEffect(() => {
    const validarAcesso = async () => {
      try {
        const tokenSalvo = await AsyncStorage.getItem("@UberCalc:token");
        if (tokenSalvo === TOKEN_MESTRE) {
          setStatusAutenticacao("logado");
          carregarBanco();
        } else {
          setStatusAutenticacao("bloqueado");
          alternarServico(false);
        }
      } catch (e) {
        setStatusAutenticacao("bloqueado");
      }
    };
    validarAcesso();
  }, []);

  const handleLogin = async () => {
    if (tokenInput.trim() === TOKEN_MESTRE) {
      await AsyncStorage.setItem("@UberCalc:token", tokenInput.trim());
      setErroToken("");
      setStatusAutenticacao("logado");
      carregarBanco();
    } else {
      setErroToken("Token inválido ou expirado. Verifique sua assinatura.");
    }
  };

  const carregarBanco = async () => {
    try {
      const dadosSalvos = await AsyncStorage.getItem("@UberCalc:veiculo");
      if (dadosSalvos) {
        const parsed = JSON.parse(dadosSalvos);
        setGasolina(parsed.gasolina || gasolina);
        setEtanol(parsed.etanol || etanol);
        setTanqueAtual(parsed.tanqueAtual || "Gasolina");

        if (parsed.bolhaHabilitada !== undefined) {
          setBolhaHabilitada(parsed.bolhaHabilitada);
        }

        const ativo =
          parsed.tanqueAtual === "Gasolina" ? parsed.gasolina : parsed.etanol;
        if (ativo) {
          configCarro.current = {
            preco: parseFloat(ativo.preco.replace(",", ".")),
            consumo: parseFloat(ativo.consumo.replace(",", ".")),
          };
        }
      }

      if (NativeModules.UberBridge) {
        const temSobreposicao =
          await NativeModules.UberBridge.checarPermissaoSobreposicao();
        if (!temSobreposicao) setModalPermissoes(true);
      }
    } catch (e) {
      console.log("Erro ao carregar dados", e);
    }
  };

  const salvarConfiguracoes = async () => {
    try {
      const dados = { gasolina, etanol, tanqueAtual, bolhaHabilitada };
      await AsyncStorage.setItem("@UberCalc:veiculo", JSON.stringify(dados));

      const ativo = tanqueAtual === "Gasolina" ? gasolina : etanol;
      configCarro.current = {
        preco: parseFloat(ativo.preco.replace(",", ".")),
        consumo: parseFloat(ativo.consumo.replace(",", ".")),
      };
      setModalConfig(false);
    } catch (e) {
      console.log("Erro ao salvar dados", e);
    }
  };

  const salvarConfigGeral = async (novoEstadoBolha) => {
    setBolhaHabilitada(novoEstadoBolha);
    try {
      const dadosSalvos = await AsyncStorage.getItem("@UberCalc:veiculo");
      let parsed = dadosSalvos
        ? JSON.parse(dadosSalvos)
        : { gasolina, etanol, tanqueAtual };
      parsed.bolhaHabilitada = novoEstadoBolha;
      await AsyncStorage.setItem("@UberCalc:veiculo", JSON.stringify(parsed));

      if (appAtivo && NativeModules.UberBridge) {
        if (novoEstadoBolha) NativeModules.UberBridge.mostrarBolha();
        else NativeModules.UberBridge.esconderBolha();
      }
    } catch (e) {
      console.log("Erro salvar config geral", e);
    }
  };

  const alternarServico = (estado) => {
    setAppAtivo(estado);
    if (NativeModules.UberBridge) {
      NativeModules.UberBridge.alternarStatusServico(estado);
      if (estado && bolhaHabilitada) {
        NativeModules.UberBridge.mostrarBolha();
      } else {
        NativeModules.UberBridge.esconderBolha();
      }
    }
  };

  const abrirUberDriver = () => {
    if (NativeModules.UberBridge) {
      NativeModules.UberBridge.abrirAppUberDriver();
    }
  };

  useEffect(() => {
    const subscription = AppState.addEventListener("change", (nextAppState) => {
      if (nextAppState === "active") {
        if (NativeModules.UberBridge) {
          NativeModules.UberBridge.esconderBolha();
        }
      } else if (nextAppState === "background" || nextAppState === "inactive") {
        if (bolhaHabilitada && appAtivo && statusAutenticacao === "logado") {
          NativeModules.UberBridge.mostrarBolha();
        }
      }
    });

    return () => {
      subscription.remove();
    };
  }, [bolhaHabilitada, appAtivo, statusAutenticacao]);

  useEffect(() => {
    if (!NativeModules.UberBridge || statusAutenticacao !== "logado") return;
    const eventEmitter = new NativeEventEmitter(NativeModules.UberBridge);

    const listenerBolha = eventEmitter.addListener("AbrirMenuControle", () => {
      setAppAtivo((prev) => {
        const novoEstado = !prev;
        alternarServico(novoEstado);
        return novoEstado;
      });
    });

    const listenerCorrida = eventEmitter.addListener(
      "CorridaDetectada",
      (dados) => {
        if (dados === "ACEITE_DETECTADO") {
          if (corridaPendente.current) {
            setHistorico((prev) => [
              { ...corridaPendente.current, status: "aceita" },
              ...prev,
            ]);
            corridaPendente.current = null;
            NativeModules.UberBridge.esconderPopup();
          }
          return;
        }

        const matchesValor = dados.matchAll(
          /R\$?\s*(\d+(?:[,.]\d+)?)(?!\s*\/km)/gi,
        );
        let maxValor = 0;
        for (const m of matchesValor) {
          const val = parseFloat(m[1].replace(",", "."));
          if (val > maxValor) maxValor = val;
        }

        const regexTrechos =
          /(\d+)\s*min(?:utos)?\s*\(\s*(\d+[,.]?\d*)\s*km\s*\)/gi;
        const matchesTrechos = dados.matchAll(regexTrechos);

        let t = 0;
        let d = 0;
        let encontrouTrechos = false;

        for (const m of matchesTrechos) {
          encontrouTrechos = true;
          t += parseInt(m[1], 10);
          d += parseFloat(m[2].replace(",", "."));
        }

        if (!encontrouTrechos) {
          const fallbackKm = dados.matchAll(/(\d+[,.]?\d*)\s*km/gi);
          for (const m of fallbackKm) d += parseFloat(m[1].replace(",", "."));
          const fallbackMin = dados.matchAll(/(\d+)\s*min(?:utos)?/gi);
          for (const m of fallbackMin) t += parseInt(m[1], 10);
        }

        if (maxValor > 0) {
          if (d === 0) d = 1;
          if (t === 0) t = 1;

          const v = maxValor;
          const custo =
            (d / configCarro.current.consumo) * configCarro.current.preco;
          const lucro = v - custo;

          const ganhoKm = d > 0 ? lucro / d : 0;
          const ganhoHora = t > 0 ? (lucro / t) * 60 : 0;

          const tempoKmStr = `${t} min - ${d.toFixed(1)} km`;
          const lucroLiqStr = `${lucro.toFixed(2)}`;
          const rsHoraStr = ganhoHora.toFixed(0);
          const lucroPctStr =
            v > 0 ? Math.round((lucro / v) * 100) + "%" : "0%";

          let cor = "#ff5252";
          if (ganhoKm >= 1.8) cor = "#00e676";
          else if (ganhoKm >= 0.9) cor = "#ffeb3b";

          NativeModules.UberBridge.mostrarPopup(
            tempoKmStr,
            lucroLiqStr,
            rsHoraStr,
            lucroPctStr,
            cor,
          );

          corridaPendente.current = {
            id: Date.now().toString(),
            horario: new Date().toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            }),
            valor: v.toFixed(2),
            lucro: lucro.toFixed(2),
            km: d.toFixed(1),
            min: t,
            rsKm: ganhoKm.toFixed(2),
            rsHora: ganhoHora.toFixed(0),
            cor: cor,
          };
        }
      },
    );

    return () => {
      listenerBolha.remove();
      listenerCorrida.remove();
      NativeModules.UberBridge.esconderBolha();
    };
  }, [bolhaHabilitada, statusAutenticacao]);

  const custoKmGasolina =
    (parseFloat(gasolina.preco.replace(",", ".")) || 0) /
    (parseFloat(gasolina.consumo.replace(",", ".")) || 1);
  const custoKmEtanol =
    (parseFloat(etanol.preco.replace(",", ".")) || 0) /
    (parseFloat(etanol.consumo.replace(",", ".")) || 1);
  const melhorCombustivel =
    custoKmGasolina <= custoKmEtanol ? "Gasolina" : "Etanol";
  const diferencaCustoKm = Math.abs(custoKmGasolina - custoKmEtanol);

  const numAutonomia = parseFloat(autonomiaRestante) || 0;
  const margemSeguranca = 30;
  const kmUteis = Math.max(numAutonomia - margemSeguranca, 0);
  const metaFaturamento = kmUteis * 1.5;
  const valorParaAbastecer =
    (kmUteis / configCarro.current.consumo) * configCarro.current.preco;
  const lucroLivre = metaFaturamento - valorParaAbastecer;

  if (statusAutenticacao === "carregando") {
    return (
      <View
        style={[
          styles.mainContainer,
          { justifyContent: "center", alignItems: "center" },
        ]}
      >
        <ActivityIndicator size="large" color="#00e676" />
        <Text style={{ color: "#fff", marginTop: 10 }}>
          Verificando licença...
        </Text>
      </View>
    );
  }

  if (statusAutenticacao === "bloqueado") {
    return (
      <View
        style={[
          styles.mainContainer,
          { justifyContent: "center", padding: 30 },
        ]}
      >
        <View style={styles.loginCard}>
          <Text style={styles.loginTitle}>Acesso Restrito 🔒</Text>
          <Text style={styles.loginSub}>
            Insira seu Token de Assinante para ativar o aplicativo.
          </Text>

          <TextInput
            style={[
              styles.input,
              { marginTop: 20, color: "#fff", width: "100%" },
            ]}
            placeholder="Cole seu token aqui..."
            placeholderTextColor="#666"
            value={tokenInput}
            onChangeText={setTokenInput}
            autoCapitalize="characters"
          />

          {erroToken ? <Text style={styles.erroText}>{erroToken}</Text> : null}

          <TouchableOpacity style={styles.btnLoginSalvar} onPress={handleLogin}>
            <Text style={styles.btnLoginText}>Verificar Token</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.mainContainer}>
      <ScrollView style={styles.container}>
        <View style={styles.topBar}>
          <TouchableOpacity
            style={styles.btnConfigGeral}
            onPress={() => setModalConfigGeral(true)}
          >
            <Text style={styles.btnConfigText}>⚙️ App</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.btnConfig}
            onPress={() => setModalConfig(true)}
          >
            <Text style={styles.btnConfigText}>🚗 Veículo</Text>
          </TouchableOpacity>
        </View>

        <View
          style={[
            styles.topToggleCard,
            {
              backgroundColor: appAtivo ? "#003b29" : "#3b1212",
              borderColor: appAtivo ? "#00e676" : "#ff5252",
            },
          ]}
        >
          <View>
            <Text style={styles.toggleTitle}>Captura Automática</Text>
            <Text style={styles.toggleStatus}>
              {appAtivo ? "🟢 Ativo e Monitorando" : "🔴 Totalmente Pausado"}
            </Text>
          </View>
          <TouchableOpacity
            style={[
              styles.toggleBtn,
              { backgroundColor: appAtivo ? "#00875f" : "#ff5252" },
            ]}
            onPress={() => alternarServico(!appAtivo)}
          >
            <Text style={styles.toggleBtnText}>
              {appAtivo ? "Ativado" : "Desativado"}
            </Text>
          </TouchableOpacity>
        </View>

        {/* PAINEL DE COMBUSTÍVEL APERFEIÇOADO */}
        <View style={styles.dashboard}>
          <View style={styles.dashboardHeader}>
            <Text style={styles.sectionTitle}>Meta de Combustível</Text>
            {/* NOVO SELO DE SUGESTÃO DE COMBUSTÍVEL */}
            <View
              style={[
                styles.badgeSugestao,
                {
                  backgroundColor:
                    melhorCombustivel === "Gasolina" ? "#ffeb3b" : "#00e676",
                },
              ]}
            >
              <Text style={styles.badgeTexto}>Use {melhorCombustivel}</Text>
            </View>
          </View>

          <Text
            style={{
              color: "#c4c4cc",
              fontSize: 13,
              marginBottom: 8,
              marginTop: 5,
            }}
          >
            Autonomia atual do painel do carro (KM):
          </Text>
          <TextInput
            style={styles.input}
            keyboardType="numeric"
            placeholder="Ex: 150"
            placeholderTextColor="#666"
            value={autonomiaRestante}
            onChangeText={setAutonomiaRestante}
          />

          {numAutonomia > 0 && (
            <View style={{ marginTop: 10 }}>
              {numAutonomia <= margemSeguranca ? (
                <Text
                  style={[
                    styles.historyDetailHighlight,
                    { color: "#ff5252", textAlign: "center", fontSize: 14 },
                  ]}
                >
                  ⚠️ Veículo na reserva! Abasteça agora.
                </Text>
              ) : (
                <>
                  <Text
                    style={[
                      styles.lucroText,
                      {
                        marginBottom: 15,
                        textAlign: "center",
                        color: "#00e676",
                        fontWeight: "bold",
                      },
                    ]}
                  >
                    Rodagem segura útil: {kmUteis} km
                  </Text>
                  {/* DIVISÃO EXATA DOS VALORES (META, BOMBA E LUCRO) */}
                  <View style={styles.historyDetails}>
                    <View style={{ alignItems: "center", flex: 1 }}>
                      <Text style={styles.historyDetailText}>Meta Bruta</Text>
                      <Text
                        style={[
                          styles.historyValue,
                          { color: "#fff", fontSize: 16 },
                        ]}
                      >
                        R$ {metaFaturamento.toFixed(0)}
                      </Text>
                    </View>
                    <View style={{ alignItems: "center", flex: 1 }}>
                      <Text style={styles.historyDetailText}>Pra Bomba</Text>
                      <Text
                        style={[
                          styles.historyValue,
                          { color: "#ffeb3b", fontSize: 16 },
                        ]}
                      >
                        R$ {valorParaAbastecer.toFixed(0)}
                      </Text>
                    </View>
                    <View style={{ alignItems: "center", flex: 1 }}>
                      <Text style={styles.historyDetailText}>Lucro Livre</Text>
                      <Text
                        style={[
                          styles.historyValue,
                          { color: "#00e676", fontSize: 16 },
                        ]}
                      >
                        R$ {lucroLivre.toFixed(0)}
                      </Text>
                    </View>
                  </View>
                </>
              )}
            </View>
          )}
        </View>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Corridas</Text>
          {historico.length > 0 && (
            <TouchableOpacity onPress={() => setHistorico([])}>
              <Text style={styles.clearText}>Limpar Tudo</Text>
            </TouchableOpacity>
          )}
        </View>

        {historico.map((item) => (
          <View
            key={item.id}
            style={[styles.historyCard, { borderLeftColor: item.cor }]}
          >
            <View style={styles.historyRow}>
              <Text style={styles.historyTime}>🕒 {item.horario}</Text>
              <Text style={styles.historyValue}>R$ {item.valor}</Text>
            </View>
            <View style={styles.historyDetails}>
              <Text style={styles.historyDetailText}>📏 {item.km} km</Text>
              <Text
                style={[styles.historyDetailHighlight, { color: item.cor }]}
              >
                💵 R$ {item.rsKm}/km
              </Text>
              <Text style={styles.historyDetailText}>
                ⚡ R$ {item.rsHora}/h
              </Text>
            </View>

            {item.status === "aceita" && (
              <Text style={styles.statusAceita}>✅ Salvo no histórico</Text>
            )}
          </View>
        ))}
        <View style={{ height: 80 }} />
      </ScrollView>

      {/* Modal: Configurações Gerais do App */}
      <Modal visible={modalConfigGeral} animationType="fade" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <TouchableOpacity
              style={styles.btnCloseModal}
              onPress={() => setModalConfigGeral(false)}
            >
              <Text style={styles.btnCloseText}>✕</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Configurações do App</Text>

            <View style={styles.configRow}>
              <View>
                <Text
                  style={{ color: "#fff", fontSize: 16, fontWeight: "bold" }}
                >
                  Bolha Flutuante (PRO)
                </Text>
                <Text style={{ color: "#8d8d99", fontSize: 12 }}>
                  Atalho rápido sobre a Uber
                </Text>
              </View>
              <TouchableOpacity
                style={[
                  styles.toggleBtn,
                  { backgroundColor: bolhaHabilitada ? "#00e676" : "#323238" },
                ]}
                onPress={() => salvarConfigGeral(!bolhaHabilitada)}
              >
                <Text
                  style={{
                    color: bolhaHabilitada ? "#000" : "#fff",
                    fontWeight: "bold",
                  }}
                >
                  {bolhaHabilitada ? "ON" : "OFF"}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Modal: Calculadora Flex */}
      <Modal visible={modalConfig} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <TouchableOpacity
              style={styles.btnCloseModal}
              onPress={() => setModalConfig(false)}
            >
              <Text style={styles.btnCloseText}>✕</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Calculadora Flex ⛽</Text>

            {/* RECOMENDAÇÃO DE BOMBA DETALHADA */}
            <View
              style={[
                styles.recomendacaoCard,
                {
                  borderColor:
                    melhorCombustivel === "Gasolina" ? "#ffeb3b" : "#00e676",
                },
              ]}
            >
              <Text style={styles.recTitle}>Sugestão para Abastecer:</Text>
              <Text style={styles.recValue}>
                {melhorCombustivel.toUpperCase()}
              </Text>
              <Text style={styles.recSub}>
                Economia de R$ {diferencaCustoKm.toFixed(3)} por km rodado.
              </Text>
            </View>

            <View style={styles.flexRow}>
              <View style={{ flex: 1, marginRight: 10 }}>
                <Text style={styles.inputLabel}>Gasolina (R$)</Text>
                <TextInput
                  style={styles.input}
                  keyboardType="numeric"
                  value={gasolina.preco}
                  onChangeText={(t) => setGasolina({ ...gasolina, preco: t })}
                />
                <Text style={styles.inputLabel}>Consumo (km/l)</Text>
                <TextInput
                  style={styles.input}
                  keyboardType="numeric"
                  value={gasolina.consumo}
                  onChangeText={(t) => setGasolina({ ...gasolina, consumo: t })}
                />
              </View>
              <View style={{ flex: 1, marginLeft: 10 }}>
                <Text style={styles.inputLabel}>Etanol (R$)</Text>
                <TextInput
                  style={styles.input}
                  keyboardType="numeric"
                  value={etanol.preco}
                  onChangeText={(t) => setEtanol({ ...etanol, preco: t })}
                />
                <Text style={styles.inputLabel}>Consumo (km/l)</Text>
                <TextInput
                  style={styles.input}
                  keyboardType="numeric"
                  value={etanol.consumo}
                  onChangeText={(t) => setEtanol({ ...etanol, consumo: t })}
                />
              </View>
            </View>

            <Text style={styles.inputLabel}>No tanque agora:</Text>
            <View style={styles.flexRow}>
              <TouchableOpacity
                style={[
                  styles.btnRadio,
                  tanqueAtual === "Gasolina" && styles.btnRadioAtivo,
                ]}
                onPress={() => setTanqueAtual("Gasolina")}
              >
                <Text style={styles.btnRadioText}>Gasolina</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.btnRadio,
                  tanqueAtual === "Etanol" && styles.btnRadioAtivo,
                ]}
                onPress={() => setTanqueAtual("Etanol")}
              >
                <Text style={styles.btnRadioText}>Etanol</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={styles.btnSalvar}
              onPress={salvarConfiguracoes}
            >
              <Text style={styles.btnText}>Salvar Dados</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Modal de Permissões */}
      <Modal visible={modalPermissoes} animationType="fade" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <TouchableOpacity
              style={styles.btnCloseModal}
              onPress={() => setModalPermissoes(false)}
            >
              <Text style={styles.btnCloseText}>✕</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Permissões ⚠️</Text>
            <Text
              style={{
                color: "#c4c4cc",
                textAlign: "center",
                marginBottom: 20,
              }}
            >
              Para o pop-up funcionar por cima da Uber, ative as permissões
              abaixo.
            </Text>
            <TouchableOpacity
              style={[
                styles.btnSalvar,
                { backgroundColor: "#ff5252", marginBottom: 10 },
              ]}
              onPress={() =>
                NativeModules.UberBridge.abrirConfiguracoesSobreposicao()
              }
            >
              <Text style={styles.btnText}>1. Permitir Sobreposição</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.btnSalvar, { backgroundColor: "#ff5252" }]}
              onPress={() =>
                NativeModules.UberBridge.abrirConfiguracoesAcessibilidade()
              }
            >
              <Text style={styles.btnText}>2. Ativar Acessibilidade</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <TouchableOpacity
        style={styles.floatingUberBtn}
        onPress={abrirUberDriver}
      >
        <Text style={styles.floatingUberText}>🚗 Uber</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  mainContainer: { flex: 1, backgroundColor: "#121214" },
  container: { flex: 1, padding: 20 },
  topBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 30,
    marginBottom: 15,
  },
  btnConfigGeral: {
    flex: 1,
    backgroundColor: "#29292e",
    padding: 15,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#323238",
    justifyContent: "center",
    marginRight: 10,
    alignItems: "center",
  },
  btnConfig: {
    flex: 1,
    backgroundColor: "#29292e",
    padding: 15,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#323238",
    justifyContent: "center",
    alignItems: "center",
  },
  btnConfigText: { color: "#fff", fontWeight: "bold", fontSize: 14 },
  topToggleCard: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderRadius: 12,
    padding: 15,
    marginBottom: 20,
    borderWidth: 1,
    elevation: 4,
  },
  toggleTitle: { color: "#fff", fontSize: 16, fontWeight: "bold" },
  toggleStatus: { color: "#ccc", fontSize: 12, marginTop: 2 },
  toggleBtn: { paddingVertical: 8, paddingHorizontal: 16, borderRadius: 8 },
  toggleBtnText: { color: "#fff", fontWeight: "bold", fontSize: 14 },
  dashboard: {
    backgroundColor: "#202024",
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "#323238",
  },
  dashboardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 15,
  },
  badgeSugestao: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  badgeTexto: { color: "#000", fontWeight: "bold", fontSize: 12 },
  input: {
    backgroundColor: "#29292e",
    color: "#fff",
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 5,
    borderWidth: 1,
    borderColor: "#323238",
    textAlign: "center",
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  sectionTitle: { color: "#e1e1e6", fontSize: 16, fontWeight: "bold" },
  clearText: { color: "#ff5252", fontSize: 14, fontWeight: "600" },
  historyCard: {
    backgroundColor: "#202024",
    borderRadius: 12,
    padding: 15,
    marginBottom: 12,
    borderLeftWidth: 6,
    elevation: 3,
  },
  historyRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  historyTime: { color: "#8d8d99", fontSize: 12 },
  historyValue: { color: "#fff", fontSize: 18, fontWeight: "bold" },
  historyDetails: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 10,
    backgroundColor: "#121214",
    padding: 12,
    borderRadius: 8,
  },
  historyDetailText: { color: "#c4c4cc", fontSize: 12, marginBottom: 4 },
  historyDetailHighlight: { fontSize: 12, fontWeight: "bold" },
  lucroText: { color: "#8d8d99", fontSize: 13 },
  statusAceita: {
    color: "#00e676",
    textAlign: "right",
    fontSize: 12,
    fontWeight: "bold",
    marginTop: 5,
  },
  floatingUberBtn: {
    position: "absolute",
    bottom: 25,
    right: 25,
    backgroundColor: "#000000",
    borderWidth: 2,
    borderColor: "#00e676",
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 30,
    elevation: 8,
  },
  floatingUberText: { color: "#fff", fontSize: 16, fontWeight: "bold" },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.8)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  modalContent: {
    backgroundColor: "#202024",
    width: "100%",
    borderRadius: 15,
    padding: 20,
    borderWidth: 1,
    borderColor: "#323238",
    position: "relative",
  },
  btnCloseModal: {
    position: "absolute",
    top: 15,
    right: 15,
    zIndex: 10,
    padding: 10,
  },
  btnCloseText: { color: "#8d8d99", fontSize: 20, fontWeight: "bold" },
  modalTitle: {
    color: "#fff",
    fontSize: 20,
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 20,
  },
  recomendacaoCard: {
    backgroundColor: "#121214",
    padding: 15,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: "center",
    marginBottom: 20,
  },
  recTitle: { color: "#c4c4cc", fontSize: 14 },
  recValue: {
    color: "#fff",
    fontSize: 24,
    fontWeight: "bold",
    marginVertical: 5,
  },
  recSub: { color: "#00e676", fontSize: 12, fontWeight: "bold" },
  configRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#121214",
    padding: 15,
    borderRadius: 8,
  },
  flexRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  inputLabel: { color: "#c4c4cc", fontSize: 12, marginBottom: 5 },
  btnRadio: {
    flex: 1,
    padding: 12,
    borderWidth: 1,
    borderColor: "#323238",
    borderRadius: 8,
    alignItems: "center",
    marginHorizontal: 5,
  },
  btnRadioAtivo: { backgroundColor: "#00875f", borderColor: "#00e676" },
  btnRadioText: { color: "#fff", fontWeight: "bold" },
  btnSalvar: {
    backgroundColor: "#00875f",
    padding: 15,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 10,
  },
  btnText: { color: "#fff", fontSize: 16, fontWeight: "bold" },

  loginCard: {
    gap: 15,
    backgroundColor: "#202024",
    padding: 25,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: "#323238",
    alignItems: "center",
  },
  loginTitle: {
    color: "#fff",
    fontSize: 22,
    fontWeight: "bold",
    marginBottom: 10,
  },
  loginSub: { color: "#8d8d99", fontSize: 14, textAlign: "center" },
  erroText: {
    color: "#ff5252",
    fontSize: 13,
    marginTop: 10,
    textAlign: "center",
    fontWeight: "bold",
  },
  btnLoginSalvar: {
    backgroundColor: "#fff",
    padding: 15,
    borderRadius: 10,
    alignItems: "center",
    width: "100%",
    marginTop: 10,
  },
  btnLoginText: {
    color: "#000",
    fontWeight: "800",
    fontSize: 16,
  },
});
