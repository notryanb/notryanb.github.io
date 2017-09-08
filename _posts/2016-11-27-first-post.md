---
layout: post
title:  "First Post"
date:   2017-09-06 14:40:36
categories: init
---
Writing my first post. Not sure what it'll be.

> Here is a blockquote


```rust
use std::collections::HashMap;

fn count_words(text: &str) -> HashMap<&str, usize> {
    text.split(' ').fold(
        HashMap::new(),
        |mut map, word| { *map.entry(word).or_insert(0) += 1; map }
    )
} 
```

More stuff.



