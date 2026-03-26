# Recommendation ML Upgrade

This project now supports a trainable machine-learning reranker for recommendation.

## What Changed

The existing recommendation system keeps its current retrieval stage:

- semantic retrieval with embeddings
- metadata retrieval
- collaborative filtering
- hybrid merging
- personalized aggregation from recent history

On top of that, the system now adds a second-stage ML reranker based on implicit-feedback matrix factorization.

## Model Type

- model: implicit matrix factorization
- training signal: `borrow_orders`
- feedback type: implicit positive feedback
- training method: SGD with negative sampling

## Where It Is Used

- `POST /api/v1/recommendation/search`
  - retrieves candidates with the existing semantic + metadata pipeline
  - reranks them with a reader-book latent-factor score
- `GET /api/v1/recommendation/books/{book_id}/similar`
- `GET /api/v1/recommendation/books/{book_id}/collaborative`
- `GET /api/v1/recommendation/books/{book_id}/hybrid`
  - rerank candidates with a book-pair latent-factor score
- `GET /api/v1/recommendation/me/personalized`
  - adds a reader-book latent-factor score on top of the existing history aggregation result

## New Files

- `app/recommendation/ml.py`
- `scripts/train_recommendation_mf.py`

## Configuration

Two new settings are available:

- `LIBRARY_RECOMMENDATION_ML_ENABLED`
- `LIBRARY_RECOMMENDATION_ML_MODEL_PATH`

Defaults:

- enabled: `true`
- model path: `artifacts/recommendation_mf_model.json`

If the model file does not exist, the system falls back to the old ranking behavior.

## Train the Model

From the project root:

```powershell
cd c:\Users\32140\Desktop\smart_bookshelf\serve\bookshelf
.\.venv\Scripts\python.exe scripts\train_recommendation_mf.py
```

Recommended explicit command:

```powershell
.\.venv\Scripts\python.exe scripts\train_recommendation_mf.py `
  --output artifacts\recommendation_mf_model.json `
  --latent-dim 16 `
  --epochs 32 `
  --learning-rate 0.045 `
  --regularization 0.01 `
  --negatives-per-positive 3 `
  --min-reader-interactions 2 `
  --min-book-interactions 2 `
  --seed 20260326
```

## Generate More Training Borrow Data

If you do not have enough real borrow behavior yet, you can synthesize richer implicit-feedback data from:

- `中文图书数据集关键词分词.xlsx`
- `豆瓣书籍汇总.xlsx`

The generator uses:

- Chinese classification codes and keywords to build broad topic pools
- Douban tags and ratings to build interest pools and popularity priors

Run:

```powershell
cd c:\Users\32140\Desktop\smart_bookshelf\serve\bookshelf
.\.venv\Scripts\python.exe scripts\seed_recommendation_ml_borrow_orders.py
```

Recommended default workflow:

```powershell
.\.venv\Scripts\python.exe scripts\seed_recommendation_ml_borrow_orders.py
.\.venv\Scripts\python.exe scripts\train_recommendation_mf.py
```

## Start the Service with ML Enabled

```powershell
$env:LIBRARY_RECOMMENDATION_ML_ENABLED = "true"
$env:LIBRARY_RECOMMENDATION_ML_MODEL_PATH = "artifacts/recommendation_mf_model.json"
uv run uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

## Response Fields

Recommendation responses now include a top-level `ranking` block:

```json
{
  "ranking": {
    "enabled": true,
    "mode": "search",
    "ranking_mode": "reader_book",
    "model_type": "implicit_matrix_factorization",
    "trained_at": "2026-03-26T12:00:00+00:00",
    "latent_dim": 16
  }
}
```

Each result item may also contain:

```json
{
  "evidence": {
    "ranking_model": {
      "enabled": true,
      "model_type": "implicit_matrix_factorization",
      "ranking_mode": "reader_book",
      "base_score": 0.82,
      "ml_score": 0.74,
      "popularity_score": 0.61,
      "blended_score": 0.79
    }
  }
}
```

## Competition Positioning

A good way to present this system in an AI competition:

1. Stage 1 retrieval
   - semantic recall with embeddings
   - collaborative/content recall
2. Stage 2 ranking
   - machine-learning reranking with implicit-feedback matrix factorization
3. Interactive layer
   - recommendation explanations
   - conversation interface
   - voice interface

## Current Limitations

- the ML model is trained only from borrow behavior, not from explicit ratings
- cold-start books without interaction history still rely mainly on the retrieval stage
- if the trained model file is missing, the system automatically falls back to the original ranking logic
