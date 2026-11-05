export type NeetCodeDifficulty = "Easy" | "Medium" | "Hard";

export type NeetCodeProblem = {
  id: string;
  title: string;
  slug: string;
  difficulty: NeetCodeDifficulty;
  premium?: boolean;
};

export type NeetCodeCategory = {
  name: string;
  problems: NeetCodeProblem[];
};

const LEETCODE_PROBLEMS = "https://leetcode.com/problems";

function p(title: string, slug: string, difficulty: NeetCodeDifficulty, premium?: boolean): NeetCodeProblem {
  return { id: `nc-${slug}`, title, slug, difficulty, premium };
}

export const NEETCODE_150: NeetCodeCategory[] = [
  {
    name: "Arrays & Hashing",
    problems: [
      p("Contains Duplicate", "contains-duplicate", "Easy"),
      p("Valid Anagram", "valid-anagram", "Easy"),
      p("Two Sum", "two-sum", "Easy"),
      p("Group Anagrams", "group-anagrams", "Medium"),
      p("Top K Frequent Elements", "top-k-frequent-elements", "Medium"),
      p("Encode and Decode Strings", "encode-and-decode-strings", "Medium", true),
      p("Product of Array Except Self", "product-of-array-except-self", "Medium"),
      p("Valid Sudoku", "valid-sudoku", "Medium"),
      p("Longest Consecutive Sequence", "longest-consecutive-sequence", "Medium"),
    ],
  },
  {
    name: "Two Pointers",
    problems: [
      p("Valid Palindrome", "valid-palindrome", "Easy"),
      p("Two Sum II - Input Array Is Sorted", "two-sum-ii-input-array-is-sorted", "Medium"),
      p("3Sum", "3sum", "Medium"),
      p("Container With Most Water", "container-with-most-water", "Medium"),
      p("Trapping Rain Water", "trapping-rain-water", "Hard"),
    ],
  },
  {
    name: "Sliding Window",
    problems: [
      p("Best Time to Buy and Sell Stock", "best-time-to-buy-and-sell-stock", "Easy"),
      p("Longest Substring Without Repeating Characters", "longest-substring-without-repeating-characters", "Medium"),
      p("Longest Repeating Character Replacement", "longest-repeating-character-replacement", "Medium"),
      p("Permutation in String", "permutation-in-string", "Medium"),
      p("Minimum Window Substring", "minimum-window-substring", "Hard"),
      p("Sliding Window Maximum", "sliding-window-maximum", "Hard"),
    ],
  },
  {
    name: "Stack",
    problems: [
      p("Valid Parentheses", "valid-parentheses", "Easy"),
      p("Min Stack", "min-stack", "Medium"),
      p("Evaluate Reverse Polish Notation", "evaluate-reverse-polish-notation", "Medium"),
      p("Generate Parentheses", "generate-parentheses", "Medium"),
      p("Daily Temperatures", "daily-temperatures", "Medium"),
      p("Car Fleet", "car-fleet", "Medium"),
      p("Largest Rectangle in Histogram", "largest-rectangle-in-histogram", "Hard"),
    ],
  },
  {
    name: "Binary Search",
    problems: [
      p("Binary Search", "binary-search", "Easy"),
      p("Search a 2D Matrix", "search-a-2d-matrix", "Medium"),
      p("Koko Eating Bananas", "koko-eating-bananas", "Medium"),
      p("Find Minimum in Rotated Sorted Array", "find-minimum-in-rotated-sorted-array", "Medium"),
      p("Search in Rotated Sorted Array", "search-in-rotated-sorted-array", "Medium"),
      p("Time Based Key-Value Store", "time-based-key-value-store", "Medium"),
      p("Median of Two Sorted Arrays", "median-of-two-sorted-arrays", "Hard"),
    ],
  },
  {
    name: "Linked List",
    problems: [
      p("Reverse Linked List", "reverse-linked-list", "Easy"),
      p("Merge Two Sorted Lists", "merge-two-sorted-lists", "Easy"),
      p("Reorder List", "reorder-list", "Medium"),
      p("Remove Nth Node From End of List", "remove-nth-node-from-end-of-list", "Medium"),
      p("Copy List with Random Pointer", "copy-list-with-random-pointer", "Medium"),
      p("Add Two Numbers", "add-two-numbers", "Medium"),
      p("Linked List Cycle", "linked-list-cycle", "Easy"),
      p("Find the Duplicate Number", "find-the-duplicate-number", "Medium"),
      p("LRU Cache", "lru-cache", "Medium"),
      p("Merge k Sorted Lists", "merge-k-sorted-lists", "Hard"),
      p("Reverse Nodes in k-Group", "reverse-nodes-in-k-group", "Hard"),
    ],
  },
  {
    name: "Trees",
    problems: [
      p("Invert Binary Tree", "invert-binary-tree", "Easy"),
      p("Maximum Depth of Binary Tree", "maximum-depth-of-binary-tree", "Easy"),
      p("Diameter of Binary Tree", "diameter-of-binary-tree", "Easy"),
      p("Balanced Binary Tree", "balanced-binary-tree", "Easy"),
      p("Same Tree", "same-tree", "Easy"),
      p("Subtree of Another Tree", "subtree-of-another-tree", "Easy"),
      p("Lowest Common Ancestor of a Binary Search Tree", "lowest-common-ancestor-of-a-binary-search-tree", "Medium"),
      p("Binary Tree Level Order Traversal", "binary-tree-level-order-traversal", "Medium"),
      p("Binary Tree Right Side View", "binary-tree-right-side-view", "Medium"),
      p("Count Good Nodes in Binary Tree", "count-good-nodes-in-binary-tree", "Medium"),
      p("Validate Binary Search Tree", "validate-binary-search-tree", "Medium"),
      p("Kth Smallest Element in a BST", "kth-smallest-element-in-a-bst", "Medium"),
      p("Construct Binary Tree from Preorder and Inorder Traversal", "construct-binary-tree-from-preorder-and-inorder-traversal", "Medium"),
      p("Binary Tree Maximum Path Sum", "binary-tree-maximum-path-sum", "Hard"),
      p("Serialize and Deserialize Binary Tree", "serialize-and-deserialize-binary-tree", "Hard"),
    ],
  },
  {
    name: "Tries",
    problems: [
      p("Implement Trie (Prefix Tree)", "implement-trie-prefix-tree", "Medium"),
      p("Design Add and Search Words Data Structure", "design-add-and-search-words-data-structure", "Medium"),
      p("Word Search II", "word-search-ii", "Hard"),
    ],
  },
  {
    name: "Heap / Priority Queue",
    problems: [
      p("Kth Largest Element in a Stream", "kth-largest-element-in-a-stream", "Easy"),
      p("Last Stone Weight", "last-stone-weight", "Easy"),
      p("K Closest Points to Origin", "k-closest-points-to-origin", "Medium"),
      p("Kth Largest Element in an Array", "kth-largest-element-in-an-array", "Medium"),
      p("Task Scheduler", "task-scheduler", "Medium"),
      p("Design Twitter", "design-twitter", "Medium"),
      p("Find Median from Data Stream", "find-median-from-data-stream", "Hard"),
    ],
  },
  {
    name: "Backtracking",
    problems: [
      p("Subsets", "subsets", "Medium"),
      p("Combination Sum", "combination-sum", "Medium"),
      p("Permutations", "permutations", "Medium"),
      p("Subsets II", "subsets-ii", "Medium"),
      p("Combination Sum II", "combination-sum-ii", "Medium"),
      p("Word Search", "word-search", "Medium"),
      p("Palindrome Partitioning", "palindrome-partitioning", "Medium"),
      p("Letter Combinations of a Phone Number", "letter-combinations-of-a-phone-number", "Medium"),
      p("N-Queens", "n-queens", "Hard"),
    ],
  },
  {
    name: "Graphs",
    problems: [
      p("Number of Islands", "number-of-islands", "Medium"),
      p("Max Area of Island", "max-area-of-island", "Medium"),
      p("Clone Graph", "clone-graph", "Medium"),
      p("Walls and Gates", "walls-and-gates", "Medium", true),
      p("Rotting Oranges", "rotting-oranges", "Medium"),
      p("Pacific Atlantic Water Flow", "pacific-atlantic-water-flow", "Medium"),
      p("Surrounded Regions", "surrounded-regions", "Medium"),
      p("Course Schedule", "course-schedule", "Medium"),
      p("Course Schedule II", "course-schedule-ii", "Medium"),
      p("Graph Valid Tree", "graph-valid-tree", "Medium", true),
      p("Number of Connected Components in an Undirected Graph", "number-of-connected-components-in-an-undirected-graph", "Medium", true),
      p("Redundant Connection", "redundant-connection", "Medium"),
      p("Word Ladder", "word-ladder", "Hard"),
    ],
  },
  {
    name: "Advanced Graphs",
    problems: [
      p("Reconstruct Itinerary", "reconstruct-itinerary", "Hard"),
      p("Min Cost to Connect All Points", "min-cost-to-connect-all-points", "Medium"),
      p("Network Delay Time", "network-delay-time", "Medium"),
      p("Swim in Rising Water", "swim-in-rising-water", "Hard"),
      p("Alien Dictionary", "alien-dictionary", "Hard", true),
      p("Cheapest Flights Within K Stops", "cheapest-flights-within-k-stops", "Medium"),
    ],
  },
  {
    name: "1-D Dynamic Programming",
    problems: [
      p("Climbing Stairs", "climbing-stairs", "Easy"),
      p("Min Cost Climbing Stairs", "min-cost-climbing-stairs", "Easy"),
      p("House Robber", "house-robber", "Medium"),
      p("House Robber II", "house-robber-ii", "Medium"),
      p("Longest Palindromic Substring", "longest-palindromic-substring", "Medium"),
      p("Palindromic Substrings", "palindromic-substrings", "Medium"),
      p("Decode Ways", "decode-ways", "Medium"),
      p("Coin Change", "coin-change", "Medium"),
      p("Maximum Product Subarray", "maximum-product-subarray", "Medium"),
      p("Word Break", "word-break", "Medium"),
      p("Longest Increasing Subsequence", "longest-increasing-subsequence", "Medium"),
      p("Partition Equal Subset Sum", "partition-equal-subset-sum", "Medium"),
    ],
  },
  {
    name: "2-D Dynamic Programming",
    problems: [
      p("Unique Paths", "unique-paths", "Medium"),
      p("Longest Common Subsequence", "longest-common-subsequence", "Medium"),
      p("Best Time to Buy and Sell Stock with Cooldown", "best-time-to-buy-and-sell-stock-with-cooldown", "Medium"),
      p("Coin Change II", "coin-change-ii", "Medium"),
      p("Target Sum", "target-sum", "Medium"),
      p("Interleaving String", "interleaving-string", "Medium"),
      p("Longest Increasing Path in a Matrix", "longest-increasing-path-in-a-matrix", "Hard"),
      p("Distinct Subsequences", "distinct-subsequences", "Hard"),
      p("Edit Distance", "edit-distance", "Medium"),
      p("Burst Balloons", "burst-balloons", "Hard"),
      p("Regular Expression Matching", "regular-expression-matching", "Hard"),
    ],
  },
  {
    name: "Greedy",
    problems: [
      p("Maximum Subarray", "maximum-subarray", "Medium"),
      p("Jump Game", "jump-game", "Medium"),
      p("Jump Game II", "jump-game-ii", "Medium"),
      p("Gas Station", "gas-station", "Medium"),
      p("Hand of Straights", "hand-of-straights", "Medium"),
      p("Merge Triplets to Form Target Triplet", "merge-triplets-to-form-target-triplet", "Medium"),
      p("Partition Labels", "partition-labels", "Medium"),
      p("Valid Parenthesis String", "valid-parenthesis-string", "Medium"),
    ],
  },
  {
    name: "Intervals",
    problems: [
      p("Insert Interval", "insert-interval", "Medium"),
      p("Merge Intervals", "merge-intervals", "Medium"),
      p("Non-overlapping Intervals", "non-overlapping-intervals", "Medium"),
      p("Meeting Rooms", "meeting-rooms", "Easy", true),
      p("Meeting Rooms II", "meeting-rooms-ii", "Medium", true),
      p("Minimum Interval to Include Each Query", "minimum-interval-to-include-each-query", "Hard"),
    ],
  },
  {
    name: "Math & Geometry",
    problems: [
      p("Rotate Image", "rotate-image", "Medium"),
      p("Spiral Matrix", "spiral-matrix", "Medium"),
      p("Set Matrix Zeroes", "set-matrix-zeroes", "Medium"),
      p("Happy Number", "happy-number", "Easy"),
      p("Plus One", "plus-one", "Easy"),
      p("Pow(x, n)", "powx-n", "Medium"),
      p("Multiply Strings", "multiply-strings", "Medium"),
      p("Detect Squares", "detect-squares", "Medium"),
    ],
  },
  {
    name: "Bit Manipulation",
    problems: [
      p("Single Number", "single-number", "Easy"),
      p("Number of 1 Bits", "number-of-1-bits", "Easy"),
      p("Counting Bits", "counting-bits", "Easy"),
      p("Reverse Bits", "reverse-bits", "Easy"),
      p("Missing Number", "missing-number", "Easy"),
      p("Sum of Two Integers", "sum-of-two-integers", "Medium"),
      p("Reverse Integer", "reverse-integer", "Medium"),
    ],
  },
];

export function problemUrl(slug: string): string {
  return `${LEETCODE_PROBLEMS}/${slug}/`;
}

export const NEETCODE_TOTAL = NEETCODE_150.reduce((sum, category) => sum + category.problems.length, 0);
