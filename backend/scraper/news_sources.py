
NEWS_SOURCES = {

    # Each news source has their own HTML source format. Here we organize the HTML source per news source, specifically
    # looking for the headline and content features. Some articles will also include cleanup features to avoid certain 
    # things such as image captions being pulled. This makes adding more news sources seamless compared to the previous
    # implementation.
    
    "npr": {
        "rss_feed": "https://feeds.npr.org/1006/rss.xml",
        "headline": {"tag": "h1"},
        "content": {
            "container": {"tag": "div", "id": "storytext"},
            "paragraphs": {"tag": "p"}
        },
        "cleanup": [
            {"tag": "div", "class": "credit-caption"}
        ]
    },
    "ap_news": {
        "headline": {"tag": "h1", "class": "Page-headline"},
        "content": {
            "container": {"tag": "div", "class": "RichTextStoryBody"},
            "paragraphs": {"tag": "p"}
        }
    },
    "bbc": {
        "rss_feed": "http://feeds.bbci.co.uk/news/business/rss.xml",
        "headline": {"tag": "h1"},
        "content": {
            "containers": {"tag": "div", "attrs": {"data-component": "text-block"}},
            "paragraphs": {"tag": "p"}
        }
    }
}