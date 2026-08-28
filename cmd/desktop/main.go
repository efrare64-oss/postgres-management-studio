package main

import (
	"context"
	"errors"
	"fmt"
	"html"
	"io/fs"
	"log"
	"net"
	"net/http"
	"os/exec"
	"syscall"
	"time"

	webview2 "github.com/jchv/go-webview2"

	"postgres-management-studio/internal/app"
	"postgres-management-studio/internal/assets"
	"postgres-management-studio/internal/config"
)

func main() {
	setProcessDpiAwareness()
	log.SetFlags(log.LstdFlags | log.Lshortfile)

	cfg, err := config.Load()
	if err != nil {
		showError("Configuração inválida", err)
		return
	}

	dist, err := fs.Sub(assets.FS, "dist")
	if err != nil {
		showError("Frontend embutido não encontrado", err)
		return
	}

	application, err := app.Wire(context.Background(), cfg, dist)
	if err != nil {
		showError("Não foi possível iniciar a aplicação", err)
		return
	}
	defer application.Close()

	ln, err := net.Listen("tcp", "127.0.0.1:0")
	if err != nil {
		showError("Falha ao abrir porta local", err)
		return
	}
	port := ln.Addr().(*net.TCPAddr).Port

	mux := http.NewServeMux()
	mux.HandleFunc("/splash/fundo.jpg", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "image/jpeg")
		_, _ = w.Write(assets.FundoJPG())
	})
	mux.Handle("/", application.Server.Handler())

	srv := &http.Server{
		Handler:           mux,
		ReadHeaderTimeout: 15 * time.Second,
	}
	go func() {
		if err := srv.Serve(ln); err != nil && !errors.Is(err, http.ErrServerClosed) {
			log.Printf("http server: %v", err)
		}
	}()

	url := fmt.Sprintf("http://127.0.0.1:%d", port)
	fundoURL := url + "/splash/fundo.jpg"
	log.Printf("app running at %s", url)

	if !showSplash(url, fundoURL) {
		log.Printf("webview unavailable, opening default browser")
		openBrowser(url)
		select {}
	}

	runMainWindow(url)
}

// showSplash exibe uma janela de splash pequena e centralizada por 5 segundos.
// A janela principal só é aberta (maximizada) depois que ela fecha. Retorna
// false quando o WebView2 não está disponível.
// showSplash displays a small, centered splash window for 5 seconds.
// The main window only opens (maximized) after it closes. Returns
// false when WebView2 is not available.
func showSplash(baseURL, fundoURL string) bool {
	splash := webview2.NewWithOptions(webview2.WebViewOptions{
		Debug: false,
		WindowOptions: webview2.WindowOptions{
			Title:  "Postgres Management Studio",
			Width:  1280,
			Height: 720,
			Center: true,
		},
	})
	if splash == nil {
		return false
	}

	makeBorderless(uintptr(splash.Window()))
	splash.SetHtml(splashHTML(baseURL, fundoURL))

	// Fecha a splash após 5 segundos para a janela principal abrir maximizada.
	// Closes the splash after 5 seconds so the main window opens maximized.
	go func() {
		time.Sleep(5 * time.Second)
		splash.Destroy()
	}()

	splash.Run()
	return true
}

// runMainWindow abre a janela principal já maximizada.
// runMainWindow opens the main window already maximized.
func runMainWindow(url string) {
	w := webview2.NewWithOptions(webview2.WebViewOptions{
		Debug: false,
		WindowOptions: webview2.WindowOptions{
			Title:  "Postgres Management Studio",
			Width:  1280,
			Height: 820,
			Center: true,
		},
	})
	if w == nil {
		log.Printf("webview unavailable, opening default browser")
		openBrowser(url)
		select {}
	}
	defer w.Destroy()

	maximizeWindow(w)
	w.Navigate(url)
	w.Run()
}

// maximizeWindow maximiza a janela nativa (ShowWindow com SW_MAXIMIZE = 3).
// Chamada de forma síncrona antes do message loop, então a janela já aparece
// maximizada, sem piscar no tamanho inicial.
// maximizeWindow maximizes the native window (ShowWindow with SW_MAXIMIZE = 3).
// Called synchronously before the message loop, so the window already appears
// maximized, without flickering at its initial size.
func maximizeWindow(w webview2.WebView) {
	user32 := syscall.NewLazyDLL("user32.dll")
	showWindow := user32.NewProc("ShowWindow")
	_, _, _ = showWindow.Call(uintptr(w.Window()), 3)
}

// makeBorderless remove a moldura, a barra de título e os botões de janela,
// deixando a splash como uma tela limpa e centralizada.
// makeBorderless removes the frame, title bar, and window buttons, leaving
// the splash as a clean, centered screen.
func makeBorderless(hwnd uintptr) {
	const (
		gwlStyle     uintptr = ^uintptr(15) // GWL_STYLE = -16
		wsBorder     = 0x00800000
		wsCaption    = 0x00C00000
		wsSysMenu    = 0x00080000
		wsThickFrame = 0x00040000
		wsMinimize   = 0x00020000
		wsMaximize   = 0x00010000
		wsPopup      = 0x80000000
	)

	user32 := syscall.NewLazyDLL("user32.dll")
	getLong := user32.NewProc("GetWindowLongW")
	setLong := user32.NewProc("SetWindowLongW")
	setWindowPos := user32.NewProc("SetWindowPos")

	style, _, _ := getLong.Call(hwnd, gwlStyle)
	style &^= wsBorder | wsCaption | wsSysMenu | wsThickFrame | wsMinimize | wsMaximize
	style |= wsPopup
	_, _, _ = setLong.Call(hwnd, gwlStyle, style)

	// SWP_FRAMECHANGED | SWP_NOMOVE | SWP_NOSIZE | SWP_NOZORDER
	_, _, _ = setWindowPos.Call(hwnd, 0, 0, 0, 0, 0, 0x0020|0x0002|0x0001|0x0004)
}

// splashHTML exibe a tela de abertura em uma janela separada e centralizada
// antes da janela principal abrir maximizada. O fundo usa a imagem embutida
// (fundo.jpg) como plano de fundo em CSS.
// splashHTML renders the splash screen in a separate, centered window before
// the main window opens maximized. The background uses the embedded image
// (fundo.jpg) as a CSS background.
func splashHTML(baseURL, fundo string) string {
	logoURL := baseURL + "/logo.svg"
	return `<!DOCTYPE html>
<html lang="pt-BR"><head><meta charset="utf-8"/>
<style>
  body {
    margin: 0;
    height: 100vh;
    display: flex;
    align-items: center;
    justify-content: center;
    background-image: url("` + fundo + `");
    background-size: cover;
    background-position: center center;
    background-repeat: no-repeat;
    font-family: "Segoe UI", Tahoma, Arial, sans-serif;
    color: #e8e8e8;
    overflow: hidden;
    user-select: none;
  }
  .content { text-align: center; }
  .logo { margin-bottom: 18px; }
  .logo img { background: transparent; }
  .title { font-size: 32px; font-weight: 600; letter-spacing: 0.5px; text-shadow: 0 2px 6px rgba(0,0,0,0.4); }
  .version { margin-top: 6px; font-size: 15px; color: #c8d6e2; }
  .bar { margin: 28px auto 0; height: 8px; width: 340px; background: #4a4a4a; border-radius: 4px; overflow: hidden; }
  .bar-fill { height: 100%; width: 40%; background: #2f8f45; border-radius: 3px; animation: splash-load 1.1s ease-in-out infinite; }
  @keyframes splash-load { 0% { margin-left: -40%; } 100% { margin-left: 100%; } }
</style></head><body>
  <div class="content">
    <div class="logo">
      <img src="` + logoURL + `" width="132" height="132" alt="Postgres Management Studio"/>
    </div>
    <div class="title">Postgres Management Studio</div>
    <div class="version">v0.4.0</div>
    <div class="bar"><div class="bar-fill"></div></div>
  </div>
</body></html>`
}

// showError opens a window with the error message instead of exiting silently,
// which is what happened when the process terminated without any visible output.
func showError(title string, err error) {
	log.Printf("%s: %v", title, err)

	w := webview2.NewWithOptions(webview2.WebViewOptions{
		Debug: false,
		WindowOptions: webview2.WindowOptions{
			Title:  title,
			Width:  520,
			Height: 340,
			Center: true,
		},
	})
	if w == nil {
		log.Fatalf("%s: %v", title, err)
	}

	w.SetHtml(fmt.Sprintf(`<!DOCTYPE html>
<html lang="pt-BR"><head><meta charset="utf-8"/>
<style>
  body { margin: 0; font-family: "Segoe UI", Tahoma, Arial, sans-serif; background: #eef1f4; display: flex; align-items: center; justify-content: center; height: 100vh; }
  .card { background: #fff; border: 1px solid #c7c7c7; border-radius: 6px; padding: 28px 32px; max-width: 420px; box-shadow: 0 6px 18px rgba(0,0,0,.18); }
  .title { color: #b3261e; font-size: 18px; font-weight: 600; margin-bottom: 12px; }
  .msg { color: #333; font-size: 13px; line-height: 1.5; word-break: break-word; }
  .hint { margin-top: 14px; color: #6b7280; font-size: 12px; line-height: 1.5; }
  .hint b { color: #326690; }
</style></head><body>
  <div class="card">
    <div class="title">%s</div>
    <div class="msg">%s</div>
    <div class="hint">O aplicativo usa um banco local (SQLite) para as próprias configurações e não precisa de PostgreSQL instalado. Se o erro persistir, verifique o acesso de escrita à pasta de dados e feche esta janela para sair.</div>
  </div>
</body></html>`, html.EscapeString(title), html.EscapeString(err.Error())))
	w.Run()
}

func openBrowser(url string) {
	_ = exec.Command("rundll32", "url.dll,FileProtocolHandler", url).Start()
}

// setProcessDpiAwareness marks the process as per-monitor DPI aware so the
// WebView2 window is rendered natively on high-DPI displays instead of being
// bitmap-scaled by the OS (which makes text and UI look blurry).
func setProcessDpiAwareness() {
	user32 := syscall.NewLazyDLL("user32.dll")

	// SetProcessDpiAwarenessContext with PER_MONITOR_AWARE_V2 (-4).
	setContext := user32.NewProc("SetProcessDpiAwarenessContext")
	if setContext.Find() == nil {
		r, _, _ := setContext.Call(uintptr(^uintptr(3)))
		if r != 0 {
			return
		}
	}

	// Fallback: SetProcessDpiAwareness (PROCESS_PER_MONITOR_DPI_AWARE = 2).
	shcore := syscall.NewLazyDLL("shcore.dll")
	setAwareness := shcore.NewProc("SetProcessDpiAwareness")
	if setAwareness.Find() == nil {
		r, _, _ := setAwareness.Call(2)
		if r != 0 {
			return
		}
	}

	// Last resort: system DPI aware (avoids blurry scaling on 100%-class modes).
	setDPIAware := user32.NewProc("SetProcessDPIAware")
	if setDPIAware.Find() == nil {
		_, _, _ = setDPIAware.Call()
	}
}
