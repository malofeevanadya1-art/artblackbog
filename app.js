document.addEventListener('DOMContentLoaded', function() {
    const apiTokenInput = document.getElementById('api-token');
    const analyzeBtn = document.getElementById('analyze-btn');
    const dataStatus = document.getElementById('data-status');
    const resultContainer = document.getElementById('result-container');
    const reviewTextElement = document.getElementById('review-text');
    const sentimentResultElement = document.getElementById('sentiment-result');
    const errorMessageElement = document.getElementById('error-message');
    
    let reviews = [];
    
    // Load and parse the TSV file using Papa Parse
    fetch('reviews_test.tsv')
        .then(response => response.text())
        .then(tsvData => {
            const parsedData = Papa.parse(tsvData, {
                header: true,
                delimiter: '\t',
                skipEmptyLines: true
            });
            
            if (parsedData.errors.length > 0) {
                throw new Error('Error parsing TSV: ' + parsedData.errors[0].message);
            }
            
            reviews = parsedData.data
                .map(row => row.text)
                .filter(text => text && text.trim() !== '');
            
            if (reviews.length === 0) {
                throw new Error('No reviews found in the TSV file');
            }
            
            dataStatus.textContent = `Loaded ${reviews.length} reviews`;
            analyzeBtn.disabled = false;
        })
        .catch(error => {
            dataStatus.textContent = 'Error loading reviews: ' + error.message;
            console.error('Error loading reviews:', error);
        });
    
    // Handle analyze button click
    analyzeBtn.addEventListener('click', function() {
        // Clear previous results
        errorMessageElement.textContent = '';
        sentimentResultElement.innerHTML = '';
        resultContainer.style.display = 'block';
        
        // Select a random review
        const randomIndex = Math.floor(Math.random() * reviews.length);
        const randomReview = reviews[randomIndex];
        
        // Display the review
        reviewTextElement.textContent = `"${randomReview}"`;
        
        // Show loading indicator
        sentimentResultElement.innerHTML = '<div class="loading"></div> Analyzing sentiment...';
        
        // Prepare the API request
        const apiToken = apiTokenInput.value.trim();
        const headers = {
            'Content-Type': 'application/json'
        };
        
        if (apiToken) {
            headers['Authorization'] = `Bearer ${apiToken}`;
        }
        
        // Call Hugging Face API
        fetch('https://api-inference.huggingface.co/models/siebert/sentiment-roberta-large-english', {
            method: 'POST',
            headers: headers,
            body: JSON.stringify({ inputs: randomReview })
        })
        .then(response => {
            if (!response.ok) {
                if (response.status === 503) {
                    throw new Error('Model is loading, please try again in a few moments');
                } else if (response.status === 429) {
                    throw new Error('Rate limit exceeded. Please try again later or use an API token.');
                } else {
                    throw new Error(`API error: ${response.status} ${response.statusText}`);
                }
            }
            return response.json();
        })
        .then(data => {
            // Handle API response
            if (Array.isArray(data) && data.length > 0 && data[0].length > 0) {
                const result = data[0][0];
                
                let sentiment, iconClass, icon;
                
                if (result.label === 'POSITIVE' && result.score > 0.5) {
                    sentiment = 'positive';
                    iconClass = 'positive';
                    icon = '<i class="fas fa-thumbs-up"></i>';
                } else if (result.label === 'NEGATIVE' && result.score > 0.5) {
                    sentiment = 'negative';
                    iconClass = 'negative';
                    icon = '<i class="fas fa-thumbs-down"></i>';
                } else {
                    sentiment = 'neutral';
                    iconClass = 'neutral';
                    icon = '<i class="fas fa-question-circle"></i>';
                }
                
                sentimentResultElement.innerHTML = `
                    ${icon} 
                    <span>Sentiment: ${sentiment} (${(result.score * 100).toFixed(1)}% ${result.label})</span>
                `;
                sentimentResultElement.className = `sentiment-result ${iconClass}`;
            } else {
                throw new Error('Unexpected API response format');
            }
        })
        .catch(error => {
            errorMessageElement.textContent = error.message;
            sentimentResultElement.innerHTML = '';
            console.error('Error analyzing sentiment:', error);
        });
    });
});
