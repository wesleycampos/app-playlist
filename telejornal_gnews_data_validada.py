# telejornal_gnews_wp.py — capa local 16:9 estilo Breaking News (sem IA de imagem)
import os
import io
import datetime
import smtplib
import requests
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from requests.auth import HTTPBasicAuth
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry
from openai import OpenAI

# =========================
# CREDENCIAIS (você autorizou usar no código)
# =========================
OPENAI_API_KEY = "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"
GNEWS_API_KEY  = "c0555abfacb45a67954382cf1b82124d"

OPENAI_MODEL = "gpt-4o-mini"

EMAIL_REMETENTE     = "kkennedy50@gmail.com"
EMAIL_APP_PASSWORD  = "prsakuyprmmvgkjk"   # sem espaços
EMAIL_DESTINATARIO  = "natalfurucho@gmail.com"
EMAIL_COPIA         = "wesley@wkdesign.com.br"

WP_BASE_URL     = "https://portalnoticias.wkdesign.com.br"
WP_USER         = "gestormovie"
WP_APP_PASSWORD = "99a8hTYLORyaQbzUA7DKu5Al"  # sem espaços

client = OpenAI(api_key=OPENAI_API_KEY)

# =========================
# UTIL: fontes locais (tenta várias, cai no default se não achar)
# =========================
def _load_font(size=48, bold=False):
    try:
        from PIL import ImageFont
    except ImportError:
        raise RuntimeError("Pillow não instalado. Instale com: pip install pillow")
    candidates = []
    if os.name == "nt":  # Windows
        candidates += [
            r"C:\Windows\Fonts\arialbd.ttf" if bold else r"C:\Windows\Fonts\arial.ttf",
            r"C:\Windows\Fonts\segoeuib.ttf" if bold else r"C:\Windows\Fonts\segoeui.ttf",
        ]
    else:  # macOS/Linux comuns
        candidates += [
            "/System/Library/Fonts/Supplemental/Arial Bold.ttf" if bold else "/System/Library/Fonts/Supplemental/Arial.ttf",
            "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf" if bold else "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
            "/usr/share/fonts/truetype/freefont/FreeSansBold.ttf" if bold else "/usr/share/fonts/truetype/freefont/FreeSans.ttf",
        ]
    for path in candidates:
        if os.path.exists(path):
            try:
                return ImageFont.truetype(path, size)
            except Exception:
                pass
    return ImageFont.load_default()

# =========================
# GNEWS + TEXTO
# =========================
def buscar_manchete_gnews(termo: str):
    hoje_iso = datetime.date.today().isoformat()
    url = (
        "https://gnews.io/api/v4/search"
        f"?q={termo}&lang=pt&country=br&max=3&from={hoje_iso}&token={GNEWS_API_KEY}"
    )
    try:
        r = requests.get(url, timeout=30)
        r.raise_for_status()
        for a in r.json().get("articles", []):
            if hoje_iso in a.get("publishedAt", ""):
                return a.get("title"), a.get("description")
        return None, None
    except Exception as e:
        print(f"⚠️  GNews falhou para '{termo}': {e}")
        return None, None

def gerar_bloco(titulo_bloco: str, termo_busca: str) -> str:
    manchete, resumo = buscar_manchete_gnews(termo_busca)
    if not manchete:
        return f"<h2>{titulo_bloco}</h2>\n<p>[⚠️ Nenhuma notícia atualizada disponível para este bloco hoje.]</p>\n"
    prompt = f"""
Com base na seguinte manchete real: "{manchete}"
Resumo da matéria: "{resumo}"
Escreva um bloco de telejornal com até 1 minuto de leitura, direto ao ponto, no estilo jornalístico.
Sem saudações. Apenas a notícia, clara, objetiva e informativa.
"""
    try:
        resp = client.chat.completions.create(
            model=OPENAI_MODEL,
            temperature=0.3,
            messages=[
                {"role": "system", "content": "Você é um jornalista objetivo e informativo."},
                {"role": "user", "content": prompt},
            ],
        )
        texto = resp.choices[0].message.content.strip()
        return f"<h2>{titulo_bloco}</h2>\n<p>{texto}</p>\n"
    except Exception as e:
        return f"<h2>{titulo_bloco}</h2>\n<p>[Erro ao gerar com IA: {e}]</p>\n"

def gerar_roteiro_completo() -> str:
    hoje = datetime.date.today().strftime('%d/%m/%Y')
    roteiro = f"<h1>📆 Telejornal – {hoje}</h1>\n"
    blocos = {
        "🎙️ Abertura do Telejornal": "brasil",
        "🗳️ Bloco 2 – Política": "política",
        "🎓 Bloco 3 – Educação ou Saúde": "educação",
        "💰 Bloco 4 – Economia": "economia",
        "🌎 Bloco 5 – Mundo": "internacional",
        "🏛️ Bloco 6 – Brasília e Goiás": "Brasília DF",
        "☀️ Bloco 7 – Tempo e Encerramento": "previsão do tempo Brasil",
    }
    for titulo, termo in blocos.items():
        roteiro += gerar_bloco(titulo, termo)
    return roteiro

# =========================
# CAPA LOCAL 16:9 (Pillow)
# =========================
def gerar_capa_local_16x9(title="NOTÍCIAS DO DIA", subtitle=None) -> tuple[str, bytes]:
    """
    Gera PNG 1920x1080 com gradiente + faixa vermelha + título centralizado.
    Retorna (filename, image_bytes).
    """
    try:
        from PIL import Image, ImageDraw, ImageFilter, ImageFont
    except ImportError:
        raise RuntimeError("Pillow não instalado. Instale com: pip install pillow")

    w, h = 1920, 1080
    # fundo: gradiente azul -> quase preto
    bg = Image.new("RGB", (w, h), "#0b1220")
    grad = Image.new("L", (1, h))
    for y in range(h):
        grad.putpixel((0, y), int(255 * (y / h)))
    grad = grad.resize((w, h))
    blue_layer = Image.new("RGB", (w, h), "#173a78")
    bg = Image.composite(blue_layer, bg, grad)

    draw = ImageDraw.Draw(bg)

    # faixa diagonal vermelha (tipo breaking news)
    ribbon = [(0, int(h*0.68)), (w, int(h*0.48)), (w, int(h*0.62)), (0, int(h*0.82))]
    draw.polygon(ribbon, fill="#c1121f")
    draw.rectangle((0, h-6, w, h), fill="#c1121f")

    # textos
    title_font = _load_font(140, bold=True)
    sub_font   = _load_font(48, bold=False)
    date_str   = datetime.date.today().strftime("%d/%m/%Y")
    subtitle   = subtitle or f"Edição de {date_str}"

    # sombra do título
    def draw_text_centered(text, y, font, fill, shadow=True):
        bbox = draw.textbbox((0, 0), text, font=font)
        tw, th = bbox[2]-bbox[0], bbox[3]-bbox[1]
        x = (w - tw)//2
        if shadow:
            draw.text((x+3, y+3), text, font=font, fill=(0,0,0,160))
        draw.text((x, y), text, font=font, fill=fill)
        return th

    th = draw_text_centered(title, int(h*0.22), title_font, (255,255,255))
    draw_text_centered(subtitle, int(h*0.22)+th+24, sub_font, (230,230,230))

    # leve blur de fundo para dar cara de TV
    bg = bg.filter(ImageFilter.UnsharpMask(radius=2, percent=120, threshold=3))

    out = io.BytesIO()
    bg.save(out, format="PNG")
    return ("noticias-do-dia-1920x1080.png", out.getvalue())

# =========================
# E-MAIL
# =========================
def enviar_email(conteudo_html: str):
    msg = MIMEMultipart()
    msg["From"] = EMAIL_REMETENTE
    msg["To"] = EMAIL_DESTINATARIO
    msg["Cc"] = EMAIL_COPIA
    msg["Subject"] = "📰 Telejornal Diário com IA (GNews + OpenAI)"
    msg.attach(MIMEText(conteudo_html, "html"))
    try:
        with smtplib.SMTP("smtp.gmail.com", 587) as smtp:
            smtp.starttls()
            smtp.login(EMAIL_REMETENTE, EMAIL_APP_PASSWORD)
            smtp.send_message(msg)
        print("✅ E-mail enviado com sucesso!")
    except Exception as e:
        print("❌ Falha ao enviar e-mail:", e)

# =========================
# PUBLICAÇÃO WP (com capa local)
# =========================
def publicar_no_wordpress(conteudo_html: str):
    wp_posts_url = f"{WP_BASE_URL.rstrip('/')}/wp-json/wp/v2/posts"
    wp_media_url = f"{WP_BASE_URL.rstrip('/')}/wp-json/wp/v2/media"
    titulo = f"Roteiro Telejornal – {datetime.date.today().strftime('%d/%m/%Y')}"
    post = {"title": titulo, "content": conteudo_html, "status": "publish"}

    s = requests.Session()
    retries = Retry(total=3, backoff_factor=1,
                    status_forcelist=[429, 500, 502, 503, 504],
                    allowed_methods={"GET", "POST"})
    s.mount("https://", HTTPAdapter(max_retries=retries))
    json_headers = {
        "Content-Type": "application/json; charset=utf-8",
        "User-Agent": "wk-telejornal-bot/1.3",
        "Connection": "close",
    }
    media_headers = {
        "User-Agent": "wk-telejornal-bot/1.3",
        "Connection": "close",
    }

    try:
        test = s.get(f"{WP_BASE_URL.rstrip('/')}/wp-json/",
                     auth=HTTPBasicAuth(WP_USER, WP_APP_PASSWORD),
                     headers=json_headers, timeout=30)
        print("Teste WP REST:", test.status_code)

        # 1) Gera capa local e faz upload
        try:
            fname, img_bytes = gerar_capa_local_16x9()
            files = {"file": (fname, img_bytes, "image/png")}
            media_headers["Content-Disposition"] = f'attachment; filename="{fname}"'
            up = s.post(wp_media_url,
                        auth=HTTPBasicAuth(WP_USER, WP_APP_PASSWORD),
                        files=files, headers=media_headers, timeout=60)
            up.raise_for_status()
            media_id = up.json()["id"]
            print(f"✅ Capa enviada. media_id={media_id}")
            post["featured_media"] = media_id
        except Exception as e:
            print("⚠️  Falha ao gerar/enviar capa. Publicando sem imagem destacada.", e)

        # 2) Publica post
        r = s.post(wp_posts_url,
                   auth=HTTPBasicAuth(WP_USER, WP_APP_PASSWORD),
                   json=post, headers=json_headers, timeout=60)
        r.raise_for_status()
        print("✅ Post publicado com sucesso no WordPress!")
    except requests.exceptions.RequestException as e:
        body = getattr(e, "response", None).text if getattr(e, "response", None) else ""
        print("❌ Erro ao publicar:", e)
        if body:
            print("Resposta do servidor (parcial):", body[:800])

# =========================
# EXECUÇÃO
# =========================
if __name__ == "__main__":
    print("🧠 [1/3] Iniciando geração do telejornal...")
    conteudo_final = gerar_roteiro_completo()
    print("✅ Telejornal gerado.")

    print("📨 [2/3] Enviando por e-mail...")
    enviar_email(conteudo_final)

    print("🌐 [3/3] Publicando no WordPress...")
    publicar_no_wordpress(conteudo_final)

    print("✅ Fluxo concluído.")
