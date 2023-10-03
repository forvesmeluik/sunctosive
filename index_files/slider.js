(function ($) {
    'use strict';

    var SasayaSlider = function ($el, opts) {
        this.$el = $el;
        this.opts = opts;

        this.init();
    };

    SasayaSlider.VERSION = '0.2.0';

    SasayaSlider.DATA_KEY = 'sasaya-slider';

    SasayaSlider.TRANSITION_DURATION = 800;

    SasayaSlider.DEFAULTS = {
        pc: {
            intervalRatio: 1.4,
            list: {
                position: 'right',
                showCount: 4
            }
        },
        mobile: {
            intervalRatio: 1,
            list: {
                position: 'bottom',
                showCount: 2
            }
        }
    };

    SasayaSlider.prototype.init = function () {
        var that = this;

        that.busy = false;
        that.active = {};

        that.currentDevice = that.getDevice();
        that.lastDevice = that.currentDevice;

        that.$main = that.$el.find('.main');
        that.$list = $('<div>').addClass('list').appendTo(that.$el);

        that.$slides = that.$main.find('.item');

        // 建立 thumbs
        that.$slides.clone(true).appendTo(that.$list);
        that.$thumbs = that.$list.find('.item');
        that.thumbHeight = that.$main.height() / that.opts.pc.list.showCount;

        // 初始 chain
        ['$slides', '$thumbs'].forEach(function (type) {
            that[type].each(function () {
                var $current = $(this);

                [{
                    name: 'next',
                    fallback: function () {
                        return this.first();
                    }
                }, {
                    name: 'prev',
                    fallback: function () {
                        return this.last();
                    }
                }].forEach(function (direction) {
                    var $target = $current[direction.name]();

                    if (!$target.length) {
                        $target = direction.fallback.call(that[type]);
                    }

                    $current.data(direction.name, $target);
                });
            });
        });

        // 設定 active
        that.active.main = that.$slides.first();
        that.active.list = that.$thumbs.eq(1);
        that.makeActive();

        // 初始 slide 位置
        that.setSlidesPosition();

        // 註冊事件
        $(window).resize(function () {
            that.currentDevice = that.getDevice();

            if (that.currentDevice != that.lastDevice) {
                that.lastDevice = that.currentDevice;
                that.setSlidesPosition();
            }
        });

        // 開始輪播
        that.setTimeout();
    }

    SasayaSlider.prototype.getDevice = function () {
        return $(window).width() <= 768 ? 'mobile' : 'pc';
    };

    SasayaSlider.prototype.makeActive = function () {
        var that = this;

        $.each(that.active, function () {
            this.addClass('active').siblings().removeClass('active');
        });
    };

    SasayaSlider.prototype.setSlidesPosition = function (animate, callback) {
        var that = this;

        [{
            properties: { left: '-100%' },
            elements: that.active.main.data('prev')
        }, {
            properties: { left: 0 },
            elements: that.active.main
        }, {
            properties: { left: '100%' },
            elements: (function () {
                var $elements = $();

                that.active.main.siblings().each(function () {
                    if ($(this)[0] === that.active.main.data('prev')[0]) {
                        return;
                    }

                    $elements = $elements.add($(this));
                });

                return $elements;
            })()
        }, {
            properties: (function () {
                var strategies = {
                    pc: {
                        top: function () {
                            return (that.thumbHeight  * -1) + 'px';
                        },
                        left: 0
                    },
                    mobile: {
                        top: 0,
                        left: function () {
                            return (100 / that.opts.mobile.list.showCount * -1) + '%';
                        }
                    }
                }

                return strategies[that.currentDevice];
            })(),
            elements: that.active.list.data('prev')
        }, {
            properties: (function () {
                var strategies = {
                    pc: {
                        top: function (index) {
                            return (
                                that.thumbHeight *
                                Math.min(index, that.opts.pc.list.showCount)
                            ) + 'px';
                        },
                        left: 0
                    },
                    mobile: {
                        top: 0,
                        left: function (index) {
                            return (
                                (100 / that.opts.mobile.list.showCount) *
                                Math.min(index, that.opts.mobile.list.showCount)
                            ) + '%';
                        }
                    }
                };

                return strategies[that.currentDevice];
            })(),
            elements: (function () {
                var elements = [];

                for (
                    var i = 0, $thumb = that.active.list;
                    i < that.$thumbs.length - 1;
                    i++, $thumb = $thumb.data('next')
                ) {
                    elements.push($thumb);
                }

                return $(elements);
            })()
        }].forEach(function (position) {
            position.elements.each(function (index, element) {
                $.each(position.properties, function (key, value) {
                    var method = animate ? 'animate' : 'css';
                    var current = parseInt($(element).css(key));

                    if ('function' === typeof value) {
                        value = value.call(element, index, element);
                    }

                    if (
                        'animate' === method &&
                        0 === current && 0 === value || (
                            0 !== current && 0 !== value &&
                            (current < 0 && parseInt(value) > 0) ||
                            (current > 0 && parseInt(value) < 0)
                        )
                    ) {
                        method = 'css';
                    }

                    $(element)[method].apply($(element), (function () {
                        var property = {};
                        var params = [];

                        property[key] = value;
                        params.push(property);

                        if ('animate' === method) {
                            params.push(SasayaSlider.TRANSITION_DURATION);
                        }

                        return params;
                    })());
                });
            });
        });

        if ('function' === typeof callback) {
            window.setTimeout(function () {
                callback.call(that);
            }, animate ? SasayaSlider.TRANSITION_DURATION : 1);
        }
    };

    SasayaSlider.prototype.show = function (method) {
        var that = this;

        if (that.busy) {
            return;
        }

        that.busy = true;

        that.clearTimeout();

        $.each(that.active, function (key, $obj) {
            that.active[key] = $obj.data(method);
        });

        that.setSlidesPosition(true, function () {
            that.makeActive();

            that.setTimeout();

            that.busy = false;
        });
    };

    SasayaSlider.prototype.setTimeout = function () {
        var that = this;
        var interval = that.active.main.data('interval') || 5000;

        if (that.timeout) {
            that.clearTimeout();
        }

        that.timeout = window.setTimeout(function () {
            that.show('next');
        }, interval * that.opts[that.currentDevice].intervalRatio);
    };

    SasayaSlider.prototype.clearTimeout = function () {
        var that = this;

        window.clearTimeout(that.timeout);
    };

    var Plugin = function (opts) {
        var _opts = $.extend({}, SasayaSlider.DEFAULTS, 'object' === typeof opts ? opts : {});

        return this.each(function () {
            var slider = $(this).data(SasayaSlider.DATA_KEY);

            if (!slider) {
                $(this).data(SasayaSlider.DATA_KEY, slider = new SasayaSlider($(this), _opts));
            }

            if ('string' === typeof opts) {
                switch (opts) {
                    case 'prev':
                    case 'next':
                        slider.show(opts);
                        break;

                    default:
                        throw new Error('Method [' + opts + '] not found.');
                }
            }
        });
    };

    var old = $.fn.sasayaSlider;

    $.fn.sasayaSlider = Plugin;
    $.fn.sasayaSlider.Constructor = SasayaSlider;

    $.fn.sasayaSlider.noConflict = function () {
        $.fn.sasayaSlider = old;
        return this;
    };
})(jQuery);

//- vim:set sw=4:
