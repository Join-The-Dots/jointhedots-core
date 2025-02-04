export default {
  "$type": "document",
  "items": [
    {
      "$type": "property",
      "name": "x",
      "schema": {
        "type": "object",
        "properties": {
          "a": {
            "type": "string"
          },
          "b": {
            "type": "string"
          },
          "c": {
            "$ref": "#/types/myType1"
          },
          "d": {
            "type": "number"
          },
          "e": {
            "type": "string"
          }
        }
      },
      "access": "RW",
      "binding": "value"
    },
    {
      "$type": "state",
      "name": "L1",
      "schema": {
        "type": "string"
      },
      "input": {
        "type": "get",
        "at": "/x/b"
      }
    },
    {
      "$type": "function",
      "name": "F1",
      "schema": {
        "type": "object",
        "properties": {
          "u": {
            "type": "string"
          }
        }
      },
      "code": ""
    },
    {
      "$type": "rest-api",
      "name": "ghRepos",
      "url": "https://api.github.com/users/FlorianLebrun/repos"
    },
    {
      "$type": "property",
      "name": "y"
    },
    {
      "type": "display",
      "content": {
        "type": "std:div",
        "inlaid": true,
        "props": {
          "style": {
            "type": "const",
            "value": {
              "backgroundColor": "#bbb"
            }
          },
          "children": {
            "type": "group",
            "items": [
              "Props x.a: ",
              {
                "type": "get",
                "at": "/x/a"
              },
              {
                "type": "std:div",
                "props": {
                  "style": {
                    "type": "record",
                    "fields": {
                      "backgroundColor": "#999"
                    }
                  },
                  "children": {
                    "type": "group",
                    "items": [
                      "RepoName: ",
                      {
                        "type": "get",
                        "at": "/ghRepos/0/full_name"
                      },
                      {
                        "type": "@salesforce:lightning:accordion",
                        "props": {
                          "panels": {
                            type: "record",
                            fields: {
                              "a": { type: "record", fields: { summary: "Header A", children: "Content for A" } },
                              "b": { type: "record", fields: {} },
                            }
                          }
                        }
                      }
                    ]
                  }
                }
              },
              {
                "type": "@salesforce:lightning:button",
                "props": {
                  "label": {
                    "type": "get",
                    "at": "/ghRepos/0/full_name"
                  },
                  "onClick": {
                    "type": "get",
                    "at": "/ghRepos/0/full_name:run"
                  }
                }
              },
              {
                "type": "std:div",
                "inlaid": true,
                "props": {
                  "style": {
                    "type": "record",
                    "fields": {
                      "backgroundColor": "#999"
                    }
                  },
                  "children": {
                    "type": "group",
                    "items": [
                      "Other text",
                      {
                        "type": "get",
                        "at": "/x/c"
                      },
                      {
                        "type": "get",
                        "at": "/L1"
                      },
                      {
                        "type": "get",
                        "at": "/F1/u"
                      },
                      {
                        "type": ":samples_view3",
                        "props": {
                          "children": [
                            "Click"
                          ]
                        }
                      },
                      {
                        "type": "element",
                        "iterate": "value",
                        "view": {
                          "type": "inline",
                          "name": "subviewX",
                          "flow": {
                            "value": {
                              "type": "property"
                            }
                          },
                          "layout": {
                            "type": "display",
                            "content": {
                              "type": "std:div",
                              "props": {
                                "children": {
                                  "type": "get",
                                  "at": "subviewX/value/full_name"
                                }
                              }
                            }
                          },
                        },
                        "props": {
                          "value": {
                            "type": "get",
                            "at": "/ghRepos"
                          }
                        }
                      }
                    ]
                  }
                }
              }
            ]
          }
        }
      }
    }
  ],
  "types": {
    "myType1": {
      "type": "object",
      "properties": {
        "type": {
          "type": "string"
        },
        "self": {
          "$ref": "#/types/myType1"
        }
      }
    }
  }
}