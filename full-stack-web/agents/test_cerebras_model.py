from agno.agent import Agent
from agno.models.cerebras import Cerebras
import os

os.environ['CEREBRAS_API_KEY'] = 'fake_key'
agent = Agent(model=Cerebras(id="llama3.3-70b"))
print("Model initialized!")
