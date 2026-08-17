package assets

import _ "embed"

//go:embed fundo.jpg
var fundoJPG []byte

// FundoJPG retorna os bytes brutos da imagem de fundo do splash.
// FundoJPG returns the raw bytes of the splash background image.
func FundoJPG() []byte {
	return fundoJPG
}