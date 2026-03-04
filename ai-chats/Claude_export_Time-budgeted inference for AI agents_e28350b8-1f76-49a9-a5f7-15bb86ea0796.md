# Time-budgeted inference for AI agents

### User

https://arxiv.org/abs/2512.21859
All its potential banger usecases with ai agents and how to make it work at inference time with the very effeciency maybe some advanced slms n heuristics let's talk

---

### Assistant

 I'll fetch that paper to see what we're working with.

Oh damn, **TimeBill** - this is actually fire for AI agents! The paper introduces a time-budgeted inference framework that helps LLMs generate responses within strict time constraints while maintaining quality, specifically targeting robotics, autonomous driving, embodied intelligence, and industrial automation.

Let me break down the banger use cases and how to make this work efficiently:

##  Killer Use Cases for AI Agents

**Real-Time Decision Making**
- Autonomous vehicles needing to make snap decisions (merge, brake, navigate) where you literally cannot wait for 50 tokens of reasoning
- Robotic manipulation where the robot needs to decide "grab or not grab" in <100ms
- Trading bots that need to react to market conditions within microseconds
- Game AI that needs frame-perfect responses

**Anytime Algorithms for Agents**
- Multi-agent systems where you have a fixed compute budget to distribute across agent swarms
- Hierarchical agents where the coordinator needs fast responses but worker agents can think longer
- Fallback systems: try sophisticated reasoning first, but if time runs out, use cached heuristics

**Adaptive Resource Allocation**
- Chatbots that scale response depth based on server load (degraded mode during peak)
- Edge devices that adjust thinking time based on battery level
- Cloud systems that bill by token - optimize cost/performance tradeoff dynamically

**Safety-Critical Systems**
- Medical diagnosis systems that MUST respond within regulation timeframes
- Industrial control systems with hard real-time constraints
- Emergency response systems where "best answer in 2 seconds" beats "perfect answer in 20 seconds"

##  Making It Work at Inference Time

The key insight from TimeBill is the **response length predictor (RLP) + execution time estimator (ETE)** combo. Here's how to implement this efficiently:

### Architecture Stack

**1. Small Language Model (SLM) Router (~1B params)**
```
Input query → SLM classifies:
- Estimated response length (short/medium/long)
- Complexity tier (factual/reasoning/creative)
- Time budget allocation
```

Use something like Phi-3-mini or Qwen2-1.5B fine-tuned on <query, actual_response_length, generation_time> triplets from your production logs.

**2. Heuristic Pre-filters**
Before even hitting the SLM:
- Token count triggers (>500 tokens → likely long generation)
- Keyword detection ("explain step by step" → +30% time estimate)
- User history (this user always wants detailed responses)
- Cache hits (exact question seen before → instant response)

**3. Dynamic KV Cache Eviction**
The paper mentions fixed eviction ratios failing - instead use:
- **Attention-based eviction**: Drop tokens with lowest attention scores first
- **Recency + importance**: Hybrid of recent tokens + semantically important ones
- **Progressive eviction**: Start conservative, get aggressive as deadline approaches

### Practical Implementation

```python
# Pseudo-code for efficient time-budgeted inference

class TimeBudgetedAgent:
    def __init__(self):
        self.rlp = load_response_length_predictor()  # SLM
        self.ete = load_execution_time_estimator()    # Regression model
        self.cache = SemanticCache()
        
    def respond(self, query, time_budget_ms):
        # Fast path: exact cache hit
        if cached := self.cache.get(query):
            return cached  # ~5ms
        
        # Heuristic checks
        if len(query.split()) < 10 and "?" in query:
            eviction_ratio = 0.1  # Simple question, minimal eviction
        else:
            # Use SLM to predict
            pred_length = self.rlp(query)
            pred_time = self.ete(query, pred_length)
            
            # Adaptive eviction
            time_ratio = time_budget_ms / pred_time
            eviction_ratio = max(0, 1 - time_ratio)
        
        # Generate with KV eviction
        response = self.llm.generate(
            query,
            max_time=time_budget_ms * 0.9,  # 10% safety margin
            kv_eviction_ratio=eviction_ratio,
            early_stopping=True
        )
        
        # Update cache
        self.cache.set(query, response)
        return response
```

### Advanced Optimizations

**Speculative Decoding + Time Budget**
- Use draft model to generate N candidates quickly
- Main model verifies in parallel
- Stop when time budget expires, return best verified sequence

**Cascade Models**
```
Time available: 50ms  → Use Haiku
Time available: 200ms → Use Sonnet  
Time available: 1s+   → Use Opus
```

**Quantization + Pruning**
- FP16/INT8 for faster inference
- Prune attention heads that contribute <1% to output
- Layer skipping for simple queries

**Prefix Caching on Steroids**
- Pre-compute KV caches for common query prefixes
- System prompt cached once, reused for all queries
- Few-shot examples pre-cached

### Measuring Success

Track these metrics:
- **SLA compliance**: % queries answered within time budget
- **Quality degradation**: BLEU/ROUGE vs unconstrained generation
- **Efficiency frontier**: Pareto curve of time vs quality

The real magic is the **feedback loop**: every inference gives you ground truth data to improve your RLP/ETE models. After 10k+ queries, your predictions become scary accurate.

##  Next-Level Stuff

**Multi-Model Routing**
Train a meta-model that decides: "For this query, should I use fast-but-dumb model A, slow-but-smart model B, or ensemble?" based on time budget and predicted difficulty.

**Learned Eviction Policies**
Instead of heuristic KV cache eviction, train a tiny network to predict which tokens are droppable. Run this network in parallel with generation.

**Anytime Transformers**
Modify the architecture itself - each layer produces an "exit" prediction. Stop early if confidence is high enough.

This paper is basically giving us the playbook for making LLM agents viable in production systems with actual latency constraints. The combo of prediction models + adaptive resource allocation is chef's kiss.

---

### User

For the slm router we would use https://developers.googleblog.com/en/a-guide-to-fine-tuning-functiongemma/

---

### Assistant

 Oh **HELL YES** - FunctionGemma is *perfect* for this! You're absolutely onto something here. Let me explain why this is such a clever choice and how to actually build it.

## Why FunctionGemma Is Ideal for TimeBill Routing

Perfect! FunctionGemma is literally **built for this exact use case**. Here's why it's genius for TimeBill routing:

## Why FunctionGemma for TimeBill Routing

**1. Tiny but Mighty (270M params)**
- Runs on ~550MB RAM, can process on CPU
- On Samsung S25 Ultra: 512 prefill tokens + 32 decode tokens runs smoothly on-device
- Inference latency is **<50ms** on edge devices, meaning your routing decision is essentially free

**2. Native Function Calling Architecture**
Instead of teaching a generic LLM to output JSON, FunctionGemma natively understands:
```
<start_function_call>route_query{
  response_length:<escape>long<escape>,
  complexity:<escape>reasoning_heavy<escape>,
  time_budget_ms:<escape>800<escape>,
  recommended_model:<escape>sonnet<escape>
}<end_function_call>
```

**3. Fine-Tuning Transforms Performance**
On Mobile Actions dataset, accuracy jumped from 58% baseline to 85% after fine-tuning - this is exactly what you need for reliable routing.

## Concrete Implementation for TimeBill Router

### Step 1: Dataset Creation

Collect production data in this format:

```python
# training_data.jsonl
{
  "user_prompt": "Explain quantum entanglement step by step",
  "actual_response_length": 1847,  # tokens
  "actual_generation_time": 3421,  # ms
  "kv_cache_eviction_ratio": 0.15,
  "model_used": "claude-sonnet"
}

{
  "user_prompt": "What's 2+2?",
  "actual_response_length": 8,
  "actual_generation_time": 142,
  "kv_cache_eviction_ratio": 0.0,
  "model_used": "claude-haiku"
}
```

Transform into FunctionGemma format:

```python
# Convert to function calling format
def convert_to_functiongemma_format(record):
    return {
        "messages": [
            {
                "role": "user",
                "content": record["user_prompt"]
            },
            {
                "role": "assistant", 
                "content": f"<start_function_call>call:predict_inference_params{{response_length:<escape>{record['actual_response_length']}<escape>,generation_time_ms:<escape>{record['actual_generation_time']}<escape>,eviction_ratio:<escape>{record['kv_cache_eviction_ratio']}<escape>,recommended_model:<escape>{record['model_used']}<escape>}}<end_function_call>"
            }
        ]
    }
```

### Step 2: Fine-Tune with Unsloth (Fast!)

Unsloth optimizes training kernels and LoRA workflows for faster fine-tuning on consumer hardware

```python
from unsloth import FastLanguageModel
from trl import SFTTrainer
from transformers import TrainingArguments

# Load base FunctionGemma
model, tokenizer = FastLanguageModel.from_pretrained(
    model_name="unsloth/functiongemma-270m-it",
    max_seq_length=4096,
    load_in_4bit=True,  # QLoRA for efficiency
)

# Apply LoRA
model = FastLanguageModel.get_peft_model(
    model,
    r=16,  # LoRA rank
    lora_alpha=16,
    lora_dropout=0.05,
    target_modules=["q_proj", "k_proj", "v_proj", "o_proj"],
)

# Define your inference prediction function schema
tools = [
    {
        "type": "function",
        "function": {
            "name": "predict_inference_params",
            "description": "Predicts inference parameters for query routing",
            "parameters": {
                "type": "object",
                "properties": {
                    "response_length": {
                        "type": "integer",
                        "description": "Predicted response length in tokens"
                    },
                    "generation_time_ms": {
                        "type": "integer", 
                        "description": "Estimated generation time in milliseconds"
                    },
                    "eviction_ratio": {
                        "type": "number",
                        "description": "KV cache eviction ratio (0.0-1.0)"
                    },
                    "recommended_model": {
                        "type": "string",
                        "description": "Recommended model: haiku, sonnet, or opus"
                    }
                },
                "required": ["response_length", "generation_time_ms", "eviction_ratio", "recommended_model"]
            }
        }
    }
]

# Format dataset with tools
def format_with_tools(examples):
    texts = []
    for prompt in examples["user_prompt"]:
        messages = [{"role": "user", "content": prompt}]
        text = tokenizer.apply_chat_template(
            messages, 
            tools=tools,
            tokenize=False,
            add_generation_prompt=True
        )
        texts.append(text)
    return {"text": texts}

dataset = load_dataset("json", data_files="training_data.jsonl")
dataset = dataset.map(format_with_tools, batched=True)

# Train!
trainer = SFTTrainer(
    model=model,
    tokenizer=tokenizer,
    train_dataset=dataset["train"],
    dataset_text_field="text",
    max_seq_length=2048,
    args=TrainingArguments(
        per_device_train_batch_size=4,
        gradient_accumulation_steps=4,
        warmup_steps=100,
        max_steps=1000,  # Adjust based on data size
        learning_rate=2e-4,
        fp16=True,
        logging_steps=10,
        output_dir="functiongemma-timebudget-router",
    ),
)

trainer.train()

# Export to GGUF for production deployment
model.save_pretrained_gguf("functiongemma-router", tokenizer)
```

On Google Colab A100, training takes ~60 minutes end-to-end

### Step 3: Production Deployment

```python
import ollama  # Or use llama.cpp, LM Studio, etc.

class TimeBudgetRouter:
    def __init__(self):
        # Load fine-tuned FunctionGemma (runs on CPU!)
        self.router_model = "functiongemma-timebudget-router"
        
    def route_query(self, user_query: str, time_budget_ms: int):
        # Define the prediction tool
        tools = [{
            "type": "function",
            "function": {
                "name": "predict_inference_params",
                "description": "Predicts inference parameters",
                # ... schema as above
            }
        }]
        
        # Get routing decision from FunctionGemma (<50ms!)
        response = ollama.chat(
            model=self.router_model,
            messages=[{
                "role": "user", 
                "content": user_query
            }],
            tools=tools
        )
        
        # Parse function call
        if response.message.tool_calls:
            params = response.message.tool_calls[0].function.arguments
            
            predicted_time = params["generation_time_ms"]
            eviction_ratio = params["eviction_ratio"]
            recommended_model = params["recommended_model"]
            
            # Adjust based on actual time budget
            if predicted_time > time_budget_ms:
                # Need to evict more aggressively or downgrade model
                eviction_ratio = min(0.9, eviction_ratio * (predicted_time / time_budget_ms))
                
                if eviction_ratio > 0.5:
                    # Too aggressive, use smaller model instead
                    recommended_model = "haiku"
            
            return {
                "model": recommended_model,
                "kv_eviction_ratio": eviction_ratio,
                "max_tokens": params["response_length"]
            }
        
        # Fallback to conservative defaults
        return {
            "model": "haiku",
            "kv_eviction_ratio": 0.0,
            "max_tokens": 500
        }

# Usage in production
router = TimeBudgetRouter()

user_query = "Explain the TimeBill paper in detail"
time_budget = 2000  # 2 seconds

routing_decision = router.route_query(user_query, time_budget)

# Now execute with the main LLM
response = main_llm.generate(
    query=user_query,
    model=routing_decision["model"],
    kv_cache_eviction_ratio=routing_decision["kv_eviction_ratio"],
    max_tokens=routing_decision["max_tokens"],
    time_budget_ms=time_budget
)
```

## Advanced Heuristics to Stack On Top

Even before hitting FunctionGemma, add these **ultra-fast** pre-filters:

```python
class HeuristicPreFilter:
    def __init__(self):
        self.cache = {}  # Semantic cache
        
    def fast_classify(self, query: str):
        # Pattern matching (< 1ms)
        query_lower = query.lower()
        
        # Definite short responses
        if any(trigger in query_lower for trigger in [
            "what is", "define", "who is", "when did"
        ]) and len(query.split()) < 15:
            return {"bypass_router": True, "model": "haiku", "eviction": 0.0}
        
        # Code generation (usually long)
        if any(word in query_lower for word in ["write code", "implement", "create a"]):
            return {"bypass_router": True, "model": "sonnet", "eviction": 0.1}
        
        # Math/reasoning chains
        if "step by step" in query_lower or "reasoning" in query_lower:
            return {"bypass_router": True, "model": "opus", "eviction": 0.2}
        
        # Exact cache hit
        if query in self.cache:
            return {"bypass_router": True, "cached": self.cache[query]}
        
        return {"bypass_router": False}  # Needs router
```

## The Full Stack

```
User Query
    ↓
┌─────────────────────────┐
│ Heuristic Pre-Filter    │ <-- Regex/keywords (0.5ms)
│ - Cache lookup          │
│ - Simple patterns       │
└─────────────────────────┘
    ↓ (if no match)
┌─────────────────────────┐
│ FunctionGemma Router    │ <-- Fine-tuned 270M (30-50ms)
│ - Predict length        │
│ - Estimate time         │
│ - Recommend model       │
│ - Calculate eviction    │
└─────────────────────────┘
    ↓
┌─────────────────────────┐
│ Main LLM Execution      │ <-- Sonnet/Opus with adaptive config
│ - Dynamic KV eviction   │
│ - Time-bounded gen      │
│ - Early stopping        │
└─────────────────────────┘
    ↓
┌─────────────────────────┐
│ Feedback Loop           │ <-- Log actual performance
│ - Update training data  │
│ - Retrain router weekly │
└─────────────────────────┘
```

## Why This Slaps

1. **Latency overhead is negligible**: 50ms routing decision vs multi-second generation
2. **Runs anywhere**: 270M model runs on CPU, edge devices, even in-browser with Transformers.js
3. **Self-improving**: Every query improves your training data
4. **Cost effective**: Route expensive queries to cheaper models when possible
5. **Hard guarantees**: Time budgets become enforceable SLAs

The FunctionGemma Tuning Lab provides a no-code interface for fine-tuning with real-time visualization and auto-evaluation if you want to prototype even faster.

This is how you make TimeBill production-ready. The combo of TimeBill's framework + FunctionGemma's specialized routing is legitimately a game-changer for real-time AI agents.

---

