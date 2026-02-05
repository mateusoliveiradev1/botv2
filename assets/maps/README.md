# Mapas Locais

Você pode colocar as imagens dos mapas aqui para carregar localmente em vez de usar links da internet.

## Como usar:
1. Salve a imagem do mapa aqui, ex: `erangel.jpg`.
2. No arquivo `src/modules/tactics/maps.ts`, troque o link pela rota local:

```typescript
image: path.join(__dirname, '../../../assets/maps/erangel.jpg')
```

## Benefícios:
- **Mais rápido**: Não precisa baixar a imagem toda vez.
- **Seguro**: O link nunca quebra.
- **Customizável**: Você pode editar a imagem no Photoshop (colocar grades, logos, filtros) e salvar aqui.
