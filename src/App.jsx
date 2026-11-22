import React, { useState, useEffect, useMemo } from 'react'
import * as XLSX from 'xlsx'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend
} from 'recharts'
import {
  LayoutDashboard, Wine, DollarSign, LogOut, Plus, Trash2,
  AlertTriangle, CheckCircle2, Clock, Download, ShoppingCart,
  TrendingUp, Bell, Calendar, X, PackagePlus, ImagePlus
} from 'lucide-react'

const SENHA_SISTEMA = 'altto2026'
const brl = (v) => Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
const lerLocal = (chave) => {
  try { return JSON.parse(localStorage.getItem(chave) || '[]') } catch { return [] }
}

function processarImagemParaBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const img = new Image()
      img.onload = () => {
        const maxSize = 240
        let width = img.width
        let height = img.height
        if (width > height && width > maxSize) {
          height = Math.round((height * maxSize) / width)
          width = maxSize
        } else if (height >= width && height > maxSize) {
          width = Math.round((width * maxSize) / height)
          height = maxSize
        }
        const canvas = document.createElement('canvas')
        canvas.width = width
        canvas.height = height
        const ctx = canvas.getContext('2d')
        ctx.drawImage(img, 0, 0, width, height)
        resolve(canvas.toDataURL('image/jpeg', 0.78))
      }
      img.onerror = reject
      img.src = reader.result
    }
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

export default function App() {
  const [autenticado, setAutenticado] = useState(() => localStorage.getItem('altto_auth') === 'ok')
  const [password, setPassword] = useState('')
  const [authError, setAuthError] = useState('')

  const [aba, setAba] = useState('dashboard')
  const [itens, setItens] = useState(() => lerLocal('altto_itens'))
  const [financeiro, setFinanceiro] = useState(() => lerLocal('altto_financeiro'))
  const [fotoInputKey, setFotoInputKey] = useState(0)

  useEffect(() => { localStorage.setItem('altto_itens', JSON.stringify(itens)) }, [itens])
  useEffect(() => { localStorage.setItem('altto_financeiro', JSON.stringify(financeiro)) }, [financeiro])

  const [novoItem, setNovoItem] = useState({
    nome: '',
    categoria: 'Vinho',
    custo_compra: '',
    preco_venda: '',
    estoque_atual: '1',
    estoque_minimo: '2',
    foto: ''
  })

  const [compraForm, setCompraForm] = useState({
    item_id: '',
    quantidade: '1',
    valor_total: '',
    status: 'pago'
  })

  const [vendaForm, setVendaForm] = useState({
    item_id: '',
    quantidade: '1',
    status: 'pago'
  })

  const [novoFin, setNovoFin] = useState({
    tipo: 'despesa',
    descricao: '',
    valor: '',
    data_vencimento: new Date().toISOString().split('T')[0],
    status: 'pendente'
  })

  const [filtroDataInicio, setFiltroDataInicio] = useState('')
  const [filtroDataFim, setFiltroDataFim] = useState('')
  const [modalPendentesAberto, setModalPendentesAberto] = useState(false)

  function handleLogin(e) {
    e.preventDefault()
    setAuthError('')
    if (password.trim() === SENHA_SISTEMA) {
      localStorage.setItem('altto_auth', 'ok')
      setAutenticado(true)
    } else {
      setAuthError('Senha incorreta. Tente novamente.')
    }
  }

  function handleLogout() {
    localStorage.removeItem('altto_auth')
    setAutenticado(false)
    setPassword('')
  }

  async function handleSelecionarFoto(e) {
    const file = e.target.files?.[0]
    if (!file) return
    try {
      const base64 = await processarImagemParaBase64(file)
      setNovoItem((prev) => ({ ...prev, foto: base64 }))
    } catch {
      setNovoItem((prev) => ({ ...prev, foto: '' }))
    }
  }

  const itensCalculados = useMemo(() => {
    return itens.map((item) => {
      const custo = Number(item.custo_compra || 0)
      const venda = Number(item.preco_venda || 0)
      const lucroUnit = venda - custo
      const margem = venda > 0 ? (lucroUnit / venda) * 100 : 0
      return { ...item, lucroUnit, margem }
    })
  }, [itens])

  const estoqueBaixo = useMemo(() => {
    return itensCalculados.filter((i) => Number(i.estoque_atual) <= Number(i.estoque_minimo))
  }, [itensCalculados])

  const lembretesVencimento = useMemo(() => {
    const hoje = new Date()
    hoje.setHours(0, 0, 0, 0)
    const limite = new Date(hoje)
    limite.setDate(hoje.getDate() + 3)

    return financeiro.filter((f) => {
      if (f.status !== 'pendente') return false
      const [ano, mes, dia] = f.data_vencimento.split('-').map(Number)
      const dt = new Date(ano, mes - 1, dia)
      return dt <= limite
    })
  }, [financeiro])

  const todasPendentes = useMemo(() => {
    return financeiro
      .filter((f) => f.status === 'pendente')
      .sort((a, b) => a.data_vencimento.localeCompare(b.data_vencimento))
  }, [financeiro])

  const financeiroFiltrado = useMemo(() => {
    return financeiro.filter((item) => {
      if (filtroDataInicio && item.data_vencimento < filtroDataInicio) return false
      if (filtroDataFim && item.data_vencimento > filtroDataFim) return false
      return true
    })
  }, [financeiro, filtroDataInicio, filtroDataFim])

  const resumoPeriodo = useMemo(() => {
    const receitas = financeiroFiltrado.filter((f) => f.tipo === 'receita').reduce((a, b) => a + Number(b.valor), 0)
    const despesas = financeiroFiltrado.filter((f) => f.tipo === 'despesa').reduce((a, b) => a + Number(b.valor), 0)
    return { receitas, despesas, saldo: receitas - despesas }
  }, [financeiroFiltrado])

  const resumo = useMemo(() => {
    const receitasPagas = financeiro.filter((f) => f.tipo === 'receita' && f.status === 'pago').reduce((a, b) => a + Number(b.valor), 0)
    const despesasPagas = financeiro.filter((f) => f.tipo === 'despesa' && f.status === 'pago').reduce((a, b) => a + Number(b.valor), 0)
    const aPagar = financeiro.filter((f) => f.tipo === 'despesa' && f.status === 'pendente').reduce((a, b) => a + Number(b.valor), 0)
    const aReceber = financeiro.filter((f) => f.tipo === 'receita' && f.status === 'pendente').reduce((a, b) => a + Number(b.valor), 0)

    const porMes = {}
    financeiro.forEach((f) => {
      const mes = f.data_vencimento.slice(0, 7)
      if (!porMes[mes]) porMes[mes] = { mes, Receitas: 0, Despesas: 0 }
      if (f.tipo === 'receita') porMes[mes].Receitas += Number(f.valor)
      else porMes[mes].Despesas += Number(f.valor)
    })

    return {
      receitasPagas,
      despesasPagas,
      saldo: receitasPagas - despesasPagas,
      aPagar,
      aReceber,
      grafico: Object.values(porMes).sort((a, b) => a.mes.localeCompare(b.mes))
    }
  }, [financeiro])

  function cadastrarItem(e) {
    e.preventDefault()
    if (!novoItem.nome) return
    const criado = {
      id: crypto.randomUUID(),
      nome: novoItem.nome.trim(),
      categoria: novoItem.categoria,
      custo_compra: Number(novoItem.custo_compra || 0),
      preco_venda: Number(novoItem.preco_venda || 0),
      estoque_atual: Number(novoItem.estoque_atual || 0),
      estoque_minimo: Number(novoItem.estoque_minimo || 0),
      foto: novoItem.foto || ''
    }
    setItens((prev) => [...prev, criado].sort((a, b) => a.nome.localeCompare(b.nome)))
    setNovoItem({ nome: '', categoria: 'Vinho', custo_compra: '', preco_venda: '', estoque_atual: '1', estoque_minimo: '2', foto: '' })
    setFotoInputKey((k) => k + 1)
  }

  function registrarCompra(e) {
    e.preventDefault()
    const alvo = itens.find((i) => i.id === compraForm.item_id)
    if (!alvo) return
    const qtd = Number(compraForm.quantidade || 1)
    const totalPago = Number(compraForm.valor_total || Number(alvo.custo_compra) * qtd)
    const custoUnitNovo = qtd > 0 ? totalPago / qtd : Number(alvo.custo_compra)

    setItens((prev) => prev.map((i) =>
      i.id === alvo.id
        ? { ...i, estoque_atual: Number(i.estoque_atual) + qtd, custo_compra: Number(custoUnitNovo.toFixed(2)) }
        : i
    ))

    setFinanceiro((prev) => [...prev, {
      id: crypto.randomUUID(),
      tipo: 'despesa',
      descricao: `Compra: ${qtd}x ${alvo.nome}`,
      valor: totalPago,
      data_vencimento: new Date().toISOString().split('T')[0],
      status: compraForm.status
    }].sort((a, b) => a.data_vencimento.localeCompare(b.data_vencimento)))

    setCompraForm({ item_id: '', quantidade: '1', valor_total: '', status: 'pago' })
  }

  function registrarVenda(e) {
    e.preventDefault()
    const alvo = itensCalculados.find((i) => i.id === vendaForm.item_id)
    if (!alvo) return
    const qtd = Number(vendaForm.quantidade || 1)
    const totalVenda = Number(alvo.preco_venda) * qtd

    setItens((prev) => prev.map((i) =>
      i.id === alvo.id ? { ...i, estoque_atual: Math.max(0, Number(i.estoque_atual) - qtd) } : i
    ))

    setFinanceiro((prev) => [...prev, {
      id: crypto.randomUUID(),
      tipo: 'receita',
      descricao: `Venda: ${qtd}x ${alvo.nome}`,
      valor: totalVenda,
      data_vencimento: new Date().toISOString().split('T')[0],
      status: vendaForm.status
    }].sort((a, b) => a.data_vencimento.localeCompare(b.data_vencimento)))

    setVendaForm({ item_id: '', quantidade: '1', status: 'pago' })
  }

  function excluirFinanceiro(id) {
    const alvoFin = financeiro.find((f) => f.id === id)
    setFinanceiro((prev) => prev.filter((f) => f.id !== id))

    if (alvoFin && alvoFin.tipo === 'receita' && typeof alvoFin.descricao === 'string') {
      const match = alvoFin.descricao.match(/^Venda:\s*(\d+)x\s+(.+)$/)
      if (match) {
        const qtdDevolver = Number(match[1] || 0)
        const nomeItem = match[2].trim()

        if (qtdDevolver > 0) {
          setItens((prev) =>
            prev.map((item) =>
              item.nome.trim() === nomeItem
                ? { ...item, estoque_atual: Number(item.estoque_atual || 0) + qtdDevolver }
                : item
            )
          )
        }
      }
    }
  }

  function adicionarFinanceiro(e) {
    e.preventDefault()
    if (!novoFin.descricao || !novoFin.valor) return
    setFinanceiro((prev) => [...prev, {
      id: crypto.randomUUID(),
      tipo: novoFin.tipo,
      descricao: novoFin.descricao,
      valor: Number(novoFin.valor),
      data_vencimento: novoFin.data_vencimento,
      status: novoFin.status
    }].sort((a, b) => a.data_vencimento.localeCompare(b.data_vencimento)))

    setNovoFin({
      tipo: 'despesa',
      descricao: '',
      valor: '',
      data_vencimento: new Date().toISOString().split('T')[0],
      status: 'pendente'
    })
  }

  function alternarStatusFin(item) {
    setFinanceiro((prev) => prev.map((f) =>
      f.id === item.id ? { ...f, status: f.status === 'pago' ? 'pendente' : 'pago' } : f
    ))
  }

  function exportarExcel() {
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(itensCalculados.map((i) => ({
      Nome: i.nome,
      Categoria: i.categoria,
      Custo_Compra: Number(i.custo_compra),
      Preco_Venda: Number(i.preco_venda),
      Lucro_Unitario: Number(i.lucroUnit.toFixed(2)),
      Margem_Percentual: Number(i.margem.toFixed(1)),
      Estoque: i.estoque_atual,
      Estoque_Minimo: i.estoque_minimo
    }))), 'Estoque_Vinhos_Perfumes')
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(financeiro), 'Financeiro')
    XLSX.writeFile(wb, `ALTTO_${new Date().toISOString().slice(0, 10)}.xlsx`)
  }

  if (!autenticado) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#D5E1D9] p-4">
        <div className="w-full max-w-md bg-[#F9F8F6] border-2 border-[#4A1525] rounded-2xl p-8 shadow-lg">
          <div className="flex flex-col items-center mb-6">
            <img src="/logo.png" alt="ALTTO Vinhos e Perfumaria" className="w-32 h-32 object-cover rounded-full mb-3 border-2 border-[#4A1525]" />
            <h1 className="text-2xl font-bold tracking-widest text-[#4A1525]">ALTTO</h1>
            <p className="text-xs tracking-wide text-[#2B2B2B] font-semibold mt-1">Vinhos e Perfumaria</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-[#2B2B2B] mb-1">Senha de acesso</label>
              <input
                type="password" required value={password} onChange={(e) => setPassword(e.target.value)}
                placeholder="Digite a senha"
                className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-[#2B2B2B]/25 focus:outline-none focus:border-[#4A1525]"
              />
            </div>

            {authError && (
              <div className="p-3 rounded-xl bg-[#4A1525]/10 border border-[#4A1525] text-[#4A1525] text-sm font-medium">
                {authError}
              </div>
            )}

            <button
              type="submit"
              className="w-full py-3 rounded-xl bg-[#4A1525] hover:bg-[#350D1A] text-[#F9F8F6] font-semibold tracking-wide transition cursor-pointer"
            >
              Entrar
            </button>
          </form>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#D5E1D9] text-[#2B2B2B] pb-20 md:pb-8">
      <header className="bg-[#F9F8F6] border-b-2 border-[#4A1525] sticky top-0 z-20">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src="/logo.png" alt="ALTTO" className="w-11 h-11 rounded-full object-cover border border-[#4A1525]" />
            <div>
              <h1 className="font-bold text-lg leading-none tracking-widest text-[#4A1525]">ALTTO</h1>
              <span className="text-[11px] font-medium text-[#2B2B2B]/75">Vinhos e Perfumaria</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={exportarExcel}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#D5E1D9] hover:bg-[#C3D4C9] border border-[#2B2B2B]/20 text-xs font-semibold cursor-pointer"
            >
              <Download className="w-4 h-4 text-[#4A1525]" />
              <span className="hidden sm:inline">Backup Excel</span>
            </button>
            <button
              onClick={handleLogout}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#2B2B2B] text-[#F9F8F6] text-xs font-semibold hover:bg-[#4A1525] transition cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline">Sair</span>
            </button>
          </div>
        </div>

        <nav className="hidden md:flex max-w-6xl mx-auto px-4 gap-2 pb-2">
          {[
            { id: 'dashboard', label: 'Visão geral e gráficos', icon: LayoutDashboard },
            { id: 'catalogo', label: 'Compras, vendas e estoque', icon: Wine },
            { id: 'financeiro', label: 'Contas e lembretes', icon: DollarSign },
          ].map((item) => {
            const Icon = item.icon
            const ativo = aba === item.id
            return (
              <button
                key={item.id}
                onClick={() => setAba(item.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition cursor-pointer ${
                  ativo ? 'bg-[#4A1525] text-[#F9F8F6]' : 'hover:bg-[#D5E1D9] text-[#2B2B2B]'
                }`}
              >
                <Icon className="w-4 h-4" />
                {item.label}
              </button>
            )
          })}
        </nav>
      </header>

      {lembretesVencimento.length > 0 && (
        <div className="max-w-6xl mx-auto px-4 pt-4">
          <div className="bg-[#4A1525] text-[#F9F8F6] rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow">
            <div className="flex items-start gap-3">
              <Bell className="w-5 h-5 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-sm">
                  {lembretesVencimento.length} conta(s) pendente(s) vencendo hoje, atrasada(s) ou nos próximos 3 dias
                </p>
                <p className="text-xs text-[#F9F8F6]/90 mt-0.5">
                  {lembretesVencimento.map((l) => `${l.descricao} (${brl(l.valor)} - ${l.data_vencimento.split('-').reverse().join('/')})`).join(' • ')}
                </p>
              </div>
            </div>
            <button
              onClick={() => setModalPendentesAberto(true)}
              className="px-3.5 py-2 bg-[#F9F8F6] text-[#4A1525] rounded-xl text-xs font-semibold shrink-0 self-start sm:self-center cursor-pointer"
            >
              Ver contas ({todasPendentes.length})
            </button>
          </div>
        </div>
      )}

      {modalPendentesAberto && (
        <div
          onClick={() => setModalPendentesAberto(false)}
          className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-lg bg-[#F9F8F6] border-2 border-[#4A1525] rounded-2xl shadow-2xl overflow-hidden"
          >
            <div className="bg-[#4A1525] text-[#F9F8F6] px-5 py-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Bell className="w-5 h-5" />
                <h3 className="font-bold text-base">Contas pendentes — ALTTO</h3>
              </div>
              <button onClick={() => setModalPendentesAberto(false)} className="p-1 rounded-lg hover:bg-white/20 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 max-h-[70vh] overflow-y-auto space-y-2.5">
              {todasPendentes.length === 0 ? (
                <p className="text-sm text-[#2B2B2B]/70 text-center py-8 font-medium">Nenhuma conta pendente.</p>
              ) : (
                todasPendentes.map((item) => {
                  const isUrgente = lembretesVencimento.some((l) => l.id === item.id)
                  return (
                    <div
                      key={item.id}
                      className={`p-3.5 rounded-xl border flex flex-wrap items-center justify-between gap-3 ${
                        isUrgente ? 'bg-[#4A1525]/5 border-[#4A1525]' : 'bg-white border-[#2B2B2B]/15'
                      }`}
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className={`text-[11px] font-semibold px-2 py-0.5 rounded ${
                            item.tipo === 'receita' ? 'bg-emerald-100 text-emerald-800' : 'bg-[#4A1525]/15 text-[#4A1525]'
                          }`}>
                            {item.tipo === 'receita' ? 'Receita' : 'Despesa'}
                          </span>
                          {isUrgente && (
                            <span className="text-[11px] font-semibold px-2 py-0.5 rounded bg-[#4A1525] text-[#F9F8F6]">
                              Urgente
                            </span>
                          )}
                        </div>
                        <p className="font-semibold text-sm mt-1">{item.descricao}</p>
                        <p className="text-xs text-[#2B2B2B]/65">
                          Vencimento: <strong>{item.data_vencimento.split('-').reverse().join('/')}</strong>
                        </p>
                      </div>

                      <div className="flex items-center gap-2.5">
                        <span className={`font-bold text-sm ${item.tipo === 'receita' ? 'text-emerald-700' : 'text-[#4A1525]'}`}>
                          {brl(item.valor)}
                        </span>
                        <button
                          onClick={() => alternarStatusFin(item)}
                          className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold cursor-pointer"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          Dar baixa
                        </button>
                      </div>
                    </div>
                  )
                })
              )}
            </div>

            <div className="px-5 py-3 bg-[#D5E1D9] border-t border-[#2B2B2B]/15 flex items-center justify-between">
              <button
                onClick={() => { setModalPendentesAberto(false); setAba('financeiro') }}
                className="text-xs font-semibold text-[#4A1525] hover:underline cursor-pointer"
              >
                Abrir tela de contas →
              </button>
              <button
                onClick={() => setModalPendentesAberto(false)}
                className="px-4 py-1.5 rounded-xl bg-[#2B2B2B] text-[#F9F8F6] text-xs font-semibold cursor-pointer"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      <main className="max-w-6xl mx-auto px-4 pt-6 space-y-6">
        {aba === 'dashboard' && (
          <>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-[#F9F8F6] border border-[#2B2B2B]/15 rounded-2xl p-4">
                <span className="text-xs font-semibold text-[#2B2B2B]/65">Saldo em caixa</span>
                <p className={`text-2xl font-bold mt-1 ${resumo.saldo >= 0 ? 'text-[#2B2B2B]' : 'text-[#4A1525]'}`}>
                  {brl(resumo.saldo)}
                </p>
              </div>
              <div className="bg-[#F9F8F6] border border-[#2B2B2B]/15 rounded-2xl p-4">
                <span className="text-xs font-semibold text-[#2B2B2B]/65">Vendas recebidas</span>
                <p className="text-2xl font-bold mt-1 text-emerald-700">{brl(resumo.receitasPagas)}</p>
              </div>
              <div className="bg-[#F9F8F6] border border-[#2B2B2B]/15 rounded-2xl p-4">
                <span className="text-xs font-semibold text-[#2B2B2B]/65">Compras e despesas pagas</span>
                <p className="text-2xl font-bold mt-1 text-[#4A1525]">{brl(resumo.despesasPagas)}</p>
              </div>
              <div
                onClick={() => setModalPendentesAberto(true)}
                className="bg-[#F9F8F6] border-2 border-[#4A1525] rounded-2xl p-4 cursor-pointer hover:bg-[#4A1525]/5 transition"
              >
                <span className="text-xs font-semibold text-[#4A1525]">Contas a pagar (ver)</span>
                <p className="text-2xl font-bold mt-1 text-[#4A1525]">{brl(resumo.aPagar)}</p>
              </div>
            </div>

            <div className="grid lg:grid-cols-3 gap-6">
              <div className="bg-[#F9F8F6] border border-[#2B2B2B]/15 rounded-2xl p-5 space-y-5">
                <div>
                  <h2 className="font-bold text-base flex items-center gap-2 mb-3">
                    <ShoppingCart className="w-5 h-5 text-[#4A1525] shrink-0" />
                    <span>Nova venda</span>
                  </h2>
                  <form onSubmit={registrarVenda} className="space-y-3">
                    <div>
                      <label className="text-xs font-semibold">Vinho ou perfume</label>
                      <select
                        required value={vendaForm.item_id}
                        onChange={(e) => setVendaForm({ ...vendaForm, item_id: e.target.value })}
                        className="w-full mt-1 p-2.5 rounded-xl bg-white border border-[#2B2B2B]/20 text-sm"
                      >
                        <option value="">Selecione...</option>
                        {itensCalculados.map((i) => (
                          <option key={i.id} value={i.id}>
                            {i.nome} — {brl(i.preco_venda)} (Est: {i.estoque_atual})
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="text-xs font-semibold">Quantidade</label>
                      <input
                        type="number" min="1" step="1" required value={vendaForm.quantidade}
                        onChange={(e) => setVendaForm({ ...vendaForm, quantidade: e.target.value })}
                        className="w-full mt-1 p-2.5 rounded-xl bg-white border border-[#2B2B2B]/20 text-sm"
                      />
                    </div>
                    <button type="submit" className="w-full py-2.5 rounded-xl bg-[#4A1525] text-[#F9F8F6] font-semibold text-sm hover:bg-[#350D1A] cursor-pointer">
                      Lançar venda
                    </button>
                  </form>
                </div>

                {estoqueBaixo.length > 0 && (
                  <div className="pt-4 border-t border-[#2B2B2B]/15">
                    <p className="text-xs font-semibold text-[#4A1525] flex items-center gap-1.5 mb-2">
                      <AlertTriangle className="w-4 h-4" /> Estoque baixo
                    </p>
                    <ul className="space-y-1 text-xs">
                      {estoqueBaixo.map((i) => (
                        <li key={i.id} className="flex justify-between bg-white px-2.5 py-1.5 rounded-lg border border-[#4A1525]/25">
                          <span className="font-medium">{i.nome}</span>
                          <span className="text-[#4A1525] font-semibold">{i.estoque_atual} un</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              <div className="lg:col-span-2 bg-[#F9F8F6] border border-[#2B2B2B]/15 rounded-2xl p-5">
                <h2 className="font-bold text-base flex items-center gap-2 mb-4">
                  <TrendingUp className="w-5 h-5 text-[#4A1525]" /> Receitas vs. despesas por mês
                </h2>
                {resumo.grafico.length === 0 ? (
                  <p className="text-sm text-[#2B2B2B]/60 py-12 text-center">Lance uma venda ou compra/despesa para ver o gráfico.</p>
                ) : (
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={resumo.grafico}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#2B2B2B15" />
                        <XAxis dataKey="mes" tick={{ fontSize: 12 }} />
                        <YAxis tick={{ fontSize: 12 }} />
                        <Tooltip formatter={(v) => brl(v)} />
                        <Legend />
                        <Bar dataKey="Receitas" fill="#15803d" radius={[6, 6, 0, 0]} />
                        <Bar dataKey="Despesas" fill="#4A1525" radius={[6, 6, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </div>
            </div>
          </>
        )}

        {aba === 'catalogo' && (
          <div className="grid lg:grid-cols-3 gap-6">
            <div className="space-y-6">
              <div className="bg-[#F9F8F6] border border-[#2B2B2B]/15 rounded-2xl p-5">
                <h2 className="font-bold text-base flex items-center gap-2 mb-4">
                  <Plus className="w-5 h-5 text-[#4A1525]" /> Novo vinho ou perfume
                </h2>
                <form onSubmit={cadastrarItem} className="space-y-3">
                  <div>
                    <label className="text-xs font-semibold">Nome do item</label>
                    <input
                      required placeholder="Ex: Malbec Reserva / Perfume Árabe" value={novoItem.nome}
                      onChange={(e) => setNovoItem({ ...novoItem, nome: e.target.value })}
                      className="w-full mt-1 p-2.5 rounded-xl bg-white border border-[#2B2B2B]/20 text-sm"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold">Categoria</label>
                    <select
                      value={novoItem.categoria}
                      onChange={(e) => setNovoItem({ ...novoItem, categoria: e.target.value })}
                      className="w-full mt-1 p-2.5 rounded-xl bg-white border border-[#2B2B2B]/20 text-sm"
                    >
                      <option value="Vinho">Vinho</option>
                      <option value="Perfume">Perfume</option>
                      <option value="Lifestyle">Lifestyle</option>
                    </select>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-xs font-semibold">Custo unitário (R$)</label>
                      <input
                        type="number" step="0.01" required placeholder="0,00" value={novoItem.custo_compra}
                        onChange={(e) => setNovoItem({ ...novoItem, custo_compra: e.target.value })}
                        className="w-full mt-1 p-2.5 rounded-xl bg-white border border-[#2B2B2B]/20 text-sm"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-semibold">Preço de venda (R$)</label>
                      <input
                        type="number" step="0.01" required placeholder="0,00" value={novoItem.preco_venda}
                        onChange={(e) => setNovoItem({ ...novoItem, preco_venda: e.target.value })}
                        className="w-full mt-1 p-2.5 rounded-xl bg-white border border-[#2B2B2B]/20 text-sm"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-xs font-semibold">Estoque inicial</label>
                      <input
                        type="number" min="0" step="1" value={novoItem.estoque_atual}
                        onChange={(e) => setNovoItem({ ...novoItem, estoque_atual: e.target.value })}
                        className="w-full mt-1 p-2.5 rounded-xl bg-white border border-[#2B2B2B]/20 text-sm"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-semibold">Estoque mínimo</label>
                      <input
                        type="number" min="0" step="1" value={novoItem.estoque_minimo}
                        onChange={(e) => setNovoItem({ ...novoItem, estoque_minimo: e.target.value })}
                        className="w-full mt-1 p-2.5 rounded-xl bg-white border border-[#2B2B2B]/20 text-sm"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-semibold flex items-center gap-1.5">
                      <ImagePlus className="w-3.5 h-3.5 text-[#4A1525]" /> Foto do produto (opcional)
                    </label>
                    <input
                      key={fotoInputKey}
                      type="file"
                      accept="image/*"
                      onChange={handleSelecionarFoto}
                      className="w-full mt-1 p-2 rounded-xl bg-white border border-[#2B2B2B]/20 text-xs file:mr-2.5 file:py-1 file:px-2.5 file:rounded-lg file:border-0 file:bg-[#D5E1D9] file:text-[#2B2B2B] file:font-semibold cursor-pointer"
                    />
                    {novoItem.foto && (
                      <div className="mt-2 flex items-center justify-between bg-white p-2 rounded-xl border border-[#2B2B2B]/15">
                        <div className="flex items-center gap-2.5">
                          <img src={novoItem.foto} alt="Prévia" className="w-11 h-11 rounded-lg object-cover border border-[#4A1525]/30" />
                          <span className="text-xs font-medium text-[#2B2B2B]/75">Foto selecionada</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => { setNovoItem((prev) => ({ ...prev, foto: '' })); setFotoInputKey((k) => k + 1) }}
                          className="text-xs font-semibold text-[#4A1525] hover:underline cursor-pointer"
                        >
                          Remover
                        </button>
                      </div>
                    )}
                  </div>

                  <button type="submit" className="w-full py-2.5 rounded-xl bg-[#4A1525] text-[#F9F8F6] font-semibold text-sm hover:bg-[#350D1A] cursor-pointer">
                    Salvar item
                  </button>
                </form>
              </div>

              <div className="bg-[#F9F8F6] border border-[#2B2B2B]/15 rounded-2xl p-5">
                <h2 className="font-bold text-base flex items-center gap-2 mb-4">
                  <PackagePlus className="w-5 h-5 text-[#4A1525]" /> Registrar compra de mercadoria
                </h2>
                <form onSubmit={registrarCompra} className="space-y-3">
                  <div>
                    <label className="text-xs font-semibold">Item comprado</label>
                    <select
                      required value={compraForm.item_id}
                      onChange={(e) => setCompraForm({ ...compraForm, item_id: e.target.value })}
                      className="w-full mt-1 p-2.5 rounded-xl bg-white border border-[#2B2B2B]/20 text-sm"
                    >
                      <option value="">Selecione...</option>
                      {itens.map((i) => (
                        <option key={i.id} value={i.id}>{i.nome} ({i.categoria})</option>
                      ))}
                    </select>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-xs font-semibold">Qtd comprada</label>
                      <input
                        type="number" min="1" step="1" required value={compraForm.quantidade}
                        onChange={(e) => setCompraForm({ ...compraForm, quantidade: e.target.value })}
                        className="w-full mt-1 p-2.5 rounded-xl bg-white border border-[#2B2B2B]/20 text-sm"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-semibold">Valor total (R$)</label>
                      <input
                        type="number" step="0.01" required placeholder="0,00" value={compraForm.valor_total}
                        onChange={(e) => setCompraForm({ ...compraForm, valor_total: e.target.value })}
                        className="w-full mt-1 p-2.5 rounded-xl bg-white border border-[#2B2B2B]/20 text-sm"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-semibold">Pagamento</label>
                    <select
                      value={compraForm.status}
                      onChange={(e) => setCompraForm({ ...compraForm, status: e.target.value })}
                      className="w-full mt-1 p-2.5 rounded-xl bg-white border border-[#2B2B2B]/20 text-sm"
                    >
                      <option value="pago">Pago</option>
                      <option value="pendente">Pendente (gerar lembrete)</option>
                    </select>
                  </div>
                  <button type="submit" className="w-full py-2.5 rounded-xl bg-[#2B2B2B] text-[#F9F8F6] font-semibold text-sm hover:bg-[#4A1525] cursor-pointer">
                    Entrada no estoque e caixa
                  </button>
                </form>
              </div>
            </div>

            <div className="lg:col-span-2 bg-[#F9F8F6] border border-[#2B2B2B]/15 rounded-2xl p-5">
              <h2 className="font-bold text-base mb-4">Estoque, custos e margens</h2>
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="text-xs border-b border-[#2B2B2B]/15 text-[#2B2B2B]/70">
                    <tr>
                      <th className="py-2 pr-3 font-semibold">Item</th>
                      <th className="py-2 px-2 font-semibold">Custo</th>
                      <th className="py-2 px-2 font-semibold">Venda</th>
                      <th className="py-2 px-2 font-semibold">Margem</th>
                      <th className="py-2 px-2 font-semibold">Estoque</th>
                      <th className="py-2 pl-2"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#2B2B2B]/10">
                    {itensCalculados.map((i) => {
                      const baixo = Number(i.estoque_atual) <= Number(i.estoque_minimo)
                      return (
                        <tr key={i.id}>
                          <td className="py-2.5 pr-3">
                            <div className="flex items-center gap-3">
                              {i.foto ? (
                                <img src={i.foto} alt={i.nome} className="w-11 h-11 rounded-lg object-cover shrink-0 border border-[#2B2B2B]/15" />
                              ) : (
                                <div className="w-11 h-11 rounded-lg bg-[#D5E1D9] flex items-center justify-center shrink-0 text-[#4A1525]">
                                  <Wine className="w-5 h-5" />
                                </div>
                              )}
                              <div>
                                <p className="font-semibold">{i.nome}</p>
                                <span className="text-[11px] text-[#2B2B2B]/60">{i.categoria}</span>
                              </div>
                            </div>
                          </td>
                          <td className="py-2.5 px-2 text-[#4A1525] font-semibold">{brl(i.custo_compra)}</td>
                          <td className="py-2.5 px-2 font-semibold">{brl(i.preco_venda)}</td>
                          <td className="py-2.5 px-2">
                            <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-[#D5E1D9] text-[#2B2B2B]">
                              {i.margem.toFixed(1)}%
                            </span>
                          </td>
                          <td className="py-2.5 px-2">
                            <span className={`px-2 py-0.5 rounded-lg text-xs font-semibold ${
                              baixo ? 'bg-[#4A1525] text-[#F9F8F6]' : 'bg-white border border-[#2B2B2B]/15'
                            }`}>
                              {i.estoque_atual} un
                            </span>
                          </td>
                          <td className="py-2.5 pl-2 text-right">
                            <button
                              onClick={() => setItens((prev) => prev.filter((item) => item.id !== i.id))}
                              className="text-[#2B2B2B]/40 hover:text-[#4A1525] cursor-pointer"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {aba === 'financeiro' && (
          <div className="grid lg:grid-cols-3 gap-6">
            <div className="bg-[#F9F8F6] border border-[#2B2B2B]/15 rounded-2xl p-5">
              <h2 className="font-bold text-base mb-4">Novo lançamento de conta</h2>
              <form onSubmit={adicionarFinanceiro} className="space-y-3">
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setNovoFin({ ...novoFin, tipo: 'despesa' })}
                    className={`py-2 rounded-xl text-xs font-semibold border cursor-pointer ${
                      novoFin.tipo === 'despesa' ? 'bg-[#4A1525] text-[#F9F8F6] border-[#4A1525]' : 'bg-white border-[#2B2B2B]/20'
                    }`}
                  >
                    Conta ou despesa
                  </button>
                  <button
                    type="button"
                    onClick={() => setNovoFin({ ...novoFin, tipo: 'receita' })}
                    className={`py-2 rounded-xl text-xs font-semibold border cursor-pointer ${
                      novoFin.tipo === 'receita' ? 'bg-emerald-700 text-white border-emerald-700' : 'bg-white border-[#2B2B2B]/20'
                    }`}
                  >
                    Receita ou venda
                  </button>
                </div>

                <div>
                  <label className="text-xs font-semibold">Descrição</label>
                  <input
                    required placeholder="Ex: Embalagem / Frete / Conta" value={novoFin.descricao}
                    onChange={(e) => setNovoFin({ ...novoFin, descricao: e.target.value })}
                    className="w-full mt-1 p-2.5 rounded-xl bg-white border border-[#2B2B2B]/20 text-sm"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-xs font-semibold">Valor (R$)</label>
                    <input
                      type="number" step="0.01" required value={novoFin.valor}
                      onChange={(e) => setNovoFin({ ...novoFin, valor: e.target.value })}
                      className="w-full mt-1 p-2.5 rounded-xl bg-white border border-[#2B2B2B]/20 text-sm"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold">Vencimento ou data</label>
                    <input
                      type="date" required value={novoFin.data_vencimento}
                      onChange={(e) => setNovoFin({ ...novoFin, data_vencimento: e.target.value })}
                      className="w-full mt-1 p-2.5 rounded-xl bg-white border border-[#2B2B2B]/20 text-sm"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-semibold">Situação</label>
                  <select
                    value={novoFin.status}
                    onChange={(e) => setNovoFin({ ...novoFin, status: e.target.value })}
                    className="w-full mt-1 p-2.5 rounded-xl bg-white border border-[#2B2B2B]/20 text-sm"
                  >
                    <option value="pendente">Pendente (gera lembrete)</option>
                    <option value="pago">Pago ou recebido</option>
                  </select>
                </div>

                <button type="submit" className="w-full py-2.5 rounded-xl bg-[#2B2B2B] text-[#F9F8F6] font-semibold text-sm hover:bg-[#4A1525] cursor-pointer">
                  Registrar conta
                </button>
              </form>
            </div>

            <div className="lg:col-span-2 bg-[#F9F8F6] border border-[#2B2B2B]/15 rounded-2xl p-5 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 className="font-bold text-base">Controle de contas e período</h2>

                <div className="flex flex-wrap items-center gap-2 bg-[#D5E1D9] p-2 rounded-xl border border-[#2B2B2B]/15">
                  <Calendar className="w-4 h-4 text-[#4A1525] ml-1" />
                  <input
                    type="date" value={filtroDataInicio} onChange={(e) => setFiltroDataInicio(e.target.value)}
                    className="px-2 py-1 rounded-lg bg-white border border-[#2B2B2B]/20 text-xs font-medium"
                  />
                  <span className="text-xs font-medium">até</span>
                  <input
                    type="date" value={filtroDataFim} onChange={(e) => setFiltroDataFim(e.target.value)}
                    className="px-2 py-1 rounded-lg bg-white border border-[#2B2B2B]/20 text-xs font-medium"
                  />
                  {(filtroDataInicio || filtroDataFim) && (
                    <button
                      type="button"
                      onClick={() => { setFiltroDataInicio(''); setFiltroDataFim('') }}
                      className="px-2 py-1 rounded-lg bg-[#2B2B2B] text-[#F9F8F6] text-[11px] font-semibold cursor-pointer"
                    >
                      Limpar
                    </button>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2 text-xs">
                <div className="bg-white p-2.5 rounded-xl border border-[#2B2B2B]/15">
                  <span className="text-[#2B2B2B]/65 font-semibold block">Receitas (período)</span>
                  <span className="font-bold text-sm text-emerald-700">{brl(resumoPeriodo.receitas)}</span>
                </div>
                <div className="bg-white p-2.5 rounded-xl border border-[#2B2B2B]/15">
                  <span className="text-[#2B2B2B]/65 font-semibold block">Despesas (período)</span>
                  <span className="font-bold text-sm text-[#4A1525]">{brl(resumoPeriodo.despesas)}</span>
                </div>
                <div className="bg-white p-2.5 rounded-xl border border-[#2B2B2B]/15">
                  <span className="text-[#2B2B2B]/65 font-semibold block">Saldo (período)</span>
                  <span className={`font-bold text-sm ${resumoPeriodo.saldo >= 0 ? 'text-[#2B2B2B]' : 'text-[#4A1525]'}`}>
                    {brl(resumoPeriodo.saldo)}
                  </span>
                </div>
              </div>

              <div className="space-y-2">
                {financeiroFiltrado.length === 0 ? (
                  <p className="text-sm text-[#2B2B2B]/60 text-center py-6">Nenhum lançamento nesse período.</p>
                ) : (
                  financeiroFiltrado.map((item) => (
                    <div key={item.id} className="flex flex-wrap items-center justify-between gap-2 bg-white p-3 rounded-xl border border-[#2B2B2B]/15">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className={`text-[11px] font-semibold px-2 py-0.5 rounded ${
                            item.tipo === 'receita' ? 'bg-emerald-100 text-emerald-800' : 'bg-[#4A1525]/15 text-[#4A1525]'
                          }`}>
                            {item.tipo === 'receita' ? 'Receita' : 'Despesa'}
                          </span>
                          <span className="font-semibold text-sm">{item.descricao}</span>
                        </div>
                        <p className="text-xs text-[#2B2B2B]/60 mt-0.5">
                          Vencimento: {item.data_vencimento.split('-').reverse().join('/')}
                        </p>
                      </div>

                      <div className="flex items-center gap-3">
                        <span className={`font-bold text-sm ${item.tipo === 'receita' ? 'text-emerald-700' : 'text-[#4A1525]'}`}>
                          {item.tipo === 'receita' ? '+' : '-'} {brl(item.valor)}
                        </span>
                        <button
                          onClick={() => alternarStatusFin(item)}
                          className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold cursor-pointer ${
                            item.status === 'pago'
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-amber-100 text-amber-900 border border-amber-400'
                          }`}
                        >
                          {item.status === 'pago' ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Clock className="w-3.5 h-3.5" />}
                          {item.status === 'pago' ? 'Pago' : 'Pendente'}
                        </button>
                        <button
                          onClick={() => excluirFinanceiro(item.id)}
                          className="text-[#2B2B2B]/40 hover:text-[#4A1525] cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}
      </main>

      <nav className="md:hidden fixed bottom-0 inset-x-0 bg-[#F9F8F6] border-t-2 border-[#4A1525] grid grid-cols-3 py-1.5 z-30">
        {[
          { id: 'dashboard', label: 'Início', icon: LayoutDashboard },
          { id: 'catalogo', label: 'Vinhos e perf.', icon: Wine },
          { id: 'financeiro', label: 'Contas', icon: DollarSign },
        ].map((item) => {
          const Icon = item.icon
          const ativo = aba === item.id
          return (
            <button
              key={item.id}
              onClick={() => setAba(item.id)}
              className={`flex flex-col items-center justify-center py-1 text-[11px] font-semibold ${
                ativo ? 'text-[#4A1525]' : 'text-[#2B2B2B]/70'
              }`}
            >
              <Icon className="w-5 h-5 mb-0.5" />
              {item.label}
            </button>
          )
        })}
      </nav>
    </div>
  )
}